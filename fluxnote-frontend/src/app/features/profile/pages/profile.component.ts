import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DashboardLayoutComponent } from '../../../layout/dashboard-layout/dashboard-layout.component';
import {
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  BadgeComponent,
  WorkInProgressComponent,
  ModalComponent,
} from '../../../shared/components/ui';
import { AuthService, UploadService } from '../../../core/services';
import { CITIES } from '../../../core/data/cities.data';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    TranslateModule,
    DashboardLayoutComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    BadgeComponent,
    WorkInProgressComponent,
    ModalComponent,
  ],
  template: `
    <app-dashboard-layout>
      <div class="max-w-4xl">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">{{ 'PROFILE.TITLE' | translate }}</h1>

        <!-- Success/Error Messages -->
        @if (successMessage()) {
          <div
            class="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-800 dark:text-green-300"
          >
            <lucide-icon name="circle-check" class="h-5 w-5"></lucide-icon>
            <span>{{ successMessage() }}</span>
          </div>
        }
        @if (errorMessage()) {
          <div
            class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-800 dark:text-red-300"
          >
            <lucide-icon name="circle-alert" class="h-5 w-5"></lucide-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Profile Card -->
          <div class="lg:col-span-1">
            <app-card>
              <app-card-content customClass="p-6 text-center">
                <div class="relative inline-block mb-4">
                  @if (avatarPreview() || user()?.profilePictureUrl) {
                    <img
                      [src]="avatarPreview() || user()?.profilePictureUrl"
                      alt="Profile picture"
                      class="h-24 w-24 rounded-full object-cover mx-auto"
                      (error)="onAvatarError()"
                    />
                  } @else {
                    <div
                      class="h-24 w-24 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto"
                      [style.background]="user()?.color"
                    >
                      {{ user()?.initials || '' }}
                    </div>
                  }
                  <button
                    (click)="showAvatarModal.set(true)"
                    class="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#155347] text-white flex items-center justify-center hover:bg-[#0d3d31] transition-colors"
                  >
                    <lucide-icon name="camera" class="h-4 w-4"></lucide-icon>
                  </button>
                </div>
                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {{ formData().fullName || user()?.fullName || '' }}
                </h2>
                @if (formData().userName || user()?.userName) {
                  <p class="text-sm text-[#155347] dark:text-emerald-400 font-medium mb-1">
                    {{ '@' + (formData().userName || user()?.userName) }}
                  </p>
                }
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ user()?.email || '' }}</p>
                @if (user()?.createdAt) {
                  <p class="text-xs text-gray-400 mb-4">
                    {{ 'PROFILE.MEMBER_SINCE' | translate }} {{ formatDate(user()?.createdAt) }}
                  </p>
                }
                <app-badge variant="default">{{ 'PROFILE.PRO_PLAN' | translate }}</app-badge>
              </app-card-content>
            </app-card>
          </div>

          <!-- Profile Details -->
          <div class="lg:col-span-2 space-y-6">
            <app-card>
              <app-card-content customClass="p-6">
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'PROFILE.PERSONAL_INFO' | translate }}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ 'PROFILE.FULL_NAME' | translate }}</label>
                    <input
                      type="text"
                      [ngModel]="formData().fullName"
                      (ngModelChange)="updateFormField('fullName', $event)"
                      maxlength="50"
                      [class]="
                        'w-full h-10 px-4 rounded-lg border focus:outline-none focus:ring-2 text-sm ' +
                        (formErrors()['fullName']
                          ? 'border-red-400 focus:ring-red-400'
                          : 'border-gray-300 dark:border-gray-600 focus:ring-[#155347]')
                      "
                    />
                    @if (formErrors()['fullName']) {
                      <p class="text-xs text-red-500 mt-1">{{ formErrors()['fullName'] }}</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {{ 'PROFILE.USERNAME' | translate }}
                      @if (user()?.usernameChangesRemaining !== undefined) {
                        <span class="text-xs text-gray-400 font-normal ml-2">
                          {{ 'PROFILE.USERNAME_CHANGES' | translate: { count: user()?.usernameChangesRemaining } }}
                        </span>
                      }
                    </label>
                    <div class="relative">
                      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                      <input
                        type="text"
                        [ngModel]="formData().userName"
                        (ngModelChange)="updateFormField('userName', $event)"
                        placeholder="username"
                        maxlength="30"
                        [disabled]="
                          user()?.usernameChangesRemaining === 0 &&
                          formData().userName === originalData.userName
                        "
                        [class]="
                          'w-full h-10 pl-8 pr-4 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm ' +
                          (user()?.usernameChangesRemaining === 0 &&
                          formData().userName === originalData.userName
                            ? 'border-gray-200 bg-gray-50 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                            : 'border-gray-300 dark:border-gray-600')
                        "
                      />
                    </div>
                    @if (user()?.usernameChangesRemaining === 0) {
                      <p class="text-xs text-amber-600 mt-1">
                        {{ 'PROFILE.USERNAME_LIMIT' | translate }}
                      </p>
                    }
                    @if (formErrors()['userName']) {
                      <p class="text-xs text-red-500 mt-1">{{ formErrors()['userName'] }}</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ 'PROFILE.EMAIL' | translate }}</label>
                    <input
                      type="email"
                      [value]="user()?.email || ''"
                      disabled
                      class="w-full h-10 px-4 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-gray-500 text-sm cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ 'PROFILE.PHONE' | translate }}</label>
                    <input
                      type="tel"
                      maxlength="20"
                      [ngModel]="formData().phoneNumber"
                      (ngModelChange)="updateFormField('phoneNumber', $event)"
                      placeholder="+351 912 345 678"
                      [class]="
                        'w-full h-10 px-4 rounded-lg border focus:outline-none focus:ring-2 text-sm ' +
                        (formErrors()['phoneNumber']
                          ? 'border-red-400 focus:ring-red-400'
                          : 'border-gray-300 dark:border-gray-600 focus:ring-[#155347]')
                      "
                    />
                    @if (formErrors()['phoneNumber']) {
                      <p class="text-xs text-red-500 mt-1">{{ formErrors()['phoneNumber'] }}</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ 'PROFILE.LOCATION' | translate }}</label>
                    <div class="relative">
                      <input
                        type="text"
                        maxlength="100"
                        autocomplete="off"
                        [ngModel]="formData().location"
                        (ngModelChange)="onLocationInput($event)"
                        (keydown)="onLocationKeydown($event)"
                        (blur)="closeCityDropdown()"
                        [placeholder]="'PROFILE.LOCATION_PLACEHOLDER' | translate"
                        [class]="
                          'w-full h-10 px-4 rounded-lg border focus:outline-none focus:ring-2 text-sm ' +
                          (formErrors()['location']
                            ? 'border-red-400 focus:ring-red-400'
                            : 'border-gray-300 dark:border-gray-600 focus:ring-[#155347]')
                        "
                      />
                      @if (showCityDropdown()) {
                        <div
                          class="absolute z-50 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto"
                        >
                          @for (city of cityResults(); track city; let i = $index) {
                            <button
                              type="button"
                              (mousedown)="selectCity(city)"
                              [class]="
                                'w-full text-left px-4 py-2 text-sm transition-colors ' +
                                (highlightedCityIndex() === i
                                  ? 'bg-[#155347] text-white'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700')
                              "
                            >
                              {{ city }}
                            </button>
                          }
                        </div>
                      }
                    </div>
                    @if (formErrors()['location']) {
                      <p class="text-xs text-red-500 mt-1">{{ formErrors()['location'] }}</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ 'PROFILE.TIMEZONE' | translate }}</label>
                    <select
                      [ngModel]="formData().timezone"
                      (ngModelChange)="updateFormField('timezone', $event)"
                      class="w-full h-10 px-4 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="">{{ 'PROFILE.SELECT_TIMEZONE' | translate }}</option>
                      <option value="UTC-12:00">UTC-12:00 (Baker Island)</option>
                      <option value="UTC-11:00">UTC-11:00 (American Samoa)</option>
                      <option value="UTC-10:00">UTC-10:00 (Hawaii)</option>
                      <option value="UTC-09:00">UTC-09:00 (Alaska)</option>
                      <option value="UTC-08:00">UTC-08:00 (Pacific Time)</option>
                      <option value="UTC-07:00">UTC-07:00 (Mountain Time)</option>
                      <option value="UTC-06:00">UTC-06:00 (Central Time)</option>
                      <option value="UTC-05:00">UTC-05:00 (Eastern Time)</option>
                      <option value="UTC-04:00">UTC-04:00 (Atlantic Time)</option>
                      <option value="UTC-03:00">UTC-03:00 (Buenos Aires)</option>
                      <option value="UTC-02:00">UTC-02:00 (Mid-Atlantic)</option>
                      <option value="UTC-01:00">UTC-01:00 (Azores)</option>
                      <option value="UTC+00:00">UTC+00:00 (London, Lisbon)</option>
                      <option value="UTC+01:00">UTC+01:00 (Paris, Berlin)</option>
                      <option value="UTC+02:00">UTC+02:00 (Cairo, Athens)</option>
                      <option value="UTC+03:00">UTC+03:00 (Moscow, Istanbul)</option>
                      <option value="UTC+04:00">UTC+04:00 (Dubai)</option>
                      <option value="UTC+05:00">UTC+05:00 (Karachi)</option>
                      <option value="UTC+05:30">UTC+05:30 (Mumbai)</option>
                      <option value="UTC+06:00">UTC+06:00 (Dhaka)</option>
                      <option value="UTC+07:00">UTC+07:00 (Bangkok)</option>
                      <option value="UTC+08:00">UTC+08:00 (Singapore, Beijing)</option>
                      <option value="UTC+09:00">UTC+09:00 (Tokyo, Seoul)</option>
                      <option value="UTC+10:00">UTC+10:00 (Sydney)</option>
                      <option value="UTC+11:00">UTC+11:00 (Solomon Islands)</option>
                      <option value="UTC+12:00">UTC+12:00 (Auckland)</option>
                    </select>
                  </div>
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ 'PROFILE.BIO' | translate }}</label>
                    <textarea
                      [ngModel]="formData().bio"
                      (ngModelChange)="updateFormField('bio', $event)"
                      [placeholder]="'PROFILE.BIO_PLACEHOLDER' | translate"
                      maxlength="500"
                      rows="3"
                      class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm resize-none"
                    ></textarea>
                    <p class="text-xs text-gray-400 mt-1 text-right">
                      {{ formData().bio.length }}/500
                    </p>
                  </div>
                </div>
                <div class="mt-4 flex justify-end gap-2">
                  @if (hasChanges()) {
                    <app-button variant="outline" (click)="resetForm()" [disabled]="isSaving()">
                      {{ 'COMMON.CANCEL' | translate }}
                    </app-button>
                  }
                  <app-button
                    customClass="bg-[#155347] hover:bg-[#0d3d31]"
                    (click)="showSaveConfirmation()"
                    [disabled]="!hasChanges() || isSaving() || !isFormValid()"
                  >
                    {{ isSaving() ? ('PROFILE.SAVING' | translate) : ('COMMON.SAVE_CHANGES' | translate) }}
                  </app-button>
                </div>
              </app-card-content>
            </app-card>

            <app-card>
              <app-card-content customClass="p-6">
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'PROFILE.CONNECTED_ACCOUNTS' | translate }}</h3>
                <div class="space-y-3">
                  <div
                    class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div class="flex items-center gap-3">
                      <svg class="h-6 w-6" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Google</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ googleConnected() ? ('PROFILE.CONNECTED' | translate) : ('PROFILE.NOT_CONNECTED' | translate) }}
                        </p>
                      </div>
                    </div>
                    <app-button
                      variant="outline"
                      size="sm"
                      [disabled]="isCheckingExternalAccounts() || isDisconnectingGoogle()"
                      (click)="googleConnected() ? disconnectGoogle() : connectGoogle()"
                    >
                      {{ googleConnected() ? ('PROFILE.DISCONNECT' | translate) : ('PROFILE.CONNECT' | translate) }}
                    </app-button>
                  </div>
                  <div
                    class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div class="flex items-center gap-3">
                      <svg class="h-6 w-6" viewBox="0 0 23 23">
                        <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                        <path fill="#f35325" d="M1 1h10v10H1z" />
                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                      </svg>
                      <div>
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">Microsoft</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ microsoftConnected() ? ('PROFILE.CONNECTED' | translate) : ('PROFILE.NOT_CONNECTED' | translate) }}
                        </p>
                      </div>
                    </div>
                    <app-button
                      variant="outline"
                      size="sm"
                      [disabled]="isCheckingExternalAccounts() || microsoftConnected()"
                      (click)="connectMicrosoft()"
                    >
                      {{ microsoftConnected() ? ('PROFILE.CONNECTED' | translate) : ('PROFILE.CONNECT' | translate) }}
                    </app-button>
                  </div>
                </div>
              </app-card-content>
            </app-card>

            <app-card>
              <app-card-content customClass="p-6">
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{{ 'PROFILE.SECURITY' | translate }}</h3>
                <button
                  (click)="showPasswordModal.set(true)"
                  class="w-full flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <lucide-icon name="key" class="h-5 w-5 text-gray-500 dark:text-gray-400"></lucide-icon>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ 'PROFILE.CHANGE_PASSWORD' | translate }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ 'PROFILE.CHANGE_PASSWORD_DESC' | translate }}
                    </p>
                  </div>
                </button>
              </app-card-content>
            </app-card>
          </div>
        </div>
      </div>

      <!-- Avatar URL Modal -->
      @if (showAvatarModal()) {
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          (click)="closeAvatarModal()"
        >
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'PROFILE.UPDATE_PICTURE' | translate }}</h3>
              <button (click)="closeAvatarModal()" class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                <lucide-icon name="x" class="h-5 w-5"></lucide-icon>
              </button>
            </div>

            <!-- Tabs -->
            <div class="flex border-b border-gray-200 dark:border-gray-700 mb-4">
              <button
                (click)="uploadMode.set('file')"
                [class]="
                  'flex-1 py-2 text-sm font-medium border-b-2 transition-colors ' +
                  (uploadMode() === 'file'
                    ? 'border-[#155347] text-[#155347] dark:text-emerald-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')
                "
              >
                {{ 'PROFILE.UPLOAD_FILE' | translate }}
              </button>
              <button
                (click)="uploadMode.set('url')"
                [class]="
                  'flex-1 py-2 text-sm font-medium border-b-2 transition-colors ' +
                  (uploadMode() === 'url'
                    ? 'border-[#155347] text-[#155347] dark:text-emerald-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200')
                "
              >
                {{ 'PROFILE.IMAGE_URL_TAB' | translate }}
              </button>
            </div>

            <div class="space-y-4">
              <!-- File Upload Mode -->
              @if (uploadMode() === 'file') {
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ 'PROFILE.CHOOSE_IMAGE' | translate }}</label>
                  <div
                    [class]="
                      'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ' +
                      (isDragging()
                        ? 'border-[#155347] bg-[#155347]/5'
                        : 'border-gray-300 dark:border-gray-600 hover:border-[#155347]')
                    "
                    (click)="fileInput.click()"
                    (dragover)="onDragOver($event)"
                    (dragleave)="onDragLeave($event)"
                    (drop)="onDrop($event)"
                  >
                    <input
                      #fileInput
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      class="hidden"
                      (change)="onFileSelected($event)"
                    />
                    <lucide-icon
                      [name]="isDragging() ? 'image' : 'upload'"
                      [class]="
                        'h-8 w-8 mx-auto mb-2 ' +
                        (isDragging() ? 'text-[#155347] dark:text-emerald-400' : 'text-gray-400')
                      "
                    ></lucide-icon>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ isDragging() ? ('PROFILE.DROP_IMAGE' | translate) : ('PROFILE.CLICK_OR_DRAG' | translate) }}
                    </p>
                    <p class="text-xs text-gray-400 mt-1">{{ 'PROFILE.FILE_CONSTRAINTS' | translate }}</p>
                  </div>
                </div>

                @if (fileError()) {
                  <p class="text-xs text-red-500">{{ fileError() }}</p>
                }

                @if (filePreview()) {
                  <div class="text-center">
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{{ 'PROFILE.PREVIEW' | translate }}</p>
                    <img
                      [src]="filePreview()"
                      alt="Preview"
                      class="h-20 w-20 rounded-full object-cover mx-auto border-2 border-gray-200 dark:border-gray-700"
                    />
                    @if (selectedFile()) {
                      <p class="text-xs text-gray-400 mt-2">{{ selectedFile()?.name }}</p>
                    }
                  </div>
                }
              }

              <!-- URL Mode -->
              @if (uploadMode() === 'url') {
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ 'PROFILE.IMAGE_URL_LABEL' | translate }}</label>
                  <input
                    type="url"
                    [(ngModel)]="avatarUrl"
                    placeholder="https://example.com/image.jpg"
                    class="w-full h-10 px-4 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                  />
                </div>

                @if (avatarUrl) {
                  <div class="text-center">
                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">{{ 'PROFILE.PREVIEW' | translate }}</p>
                    <img
                      [src]="avatarUrl"
                      alt="Preview"
                      class="h-20 w-20 rounded-full object-cover mx-auto border-2 border-gray-200 dark:border-gray-700"
                      (error)="avatarUrlError.set(true)"
                      (load)="avatarUrlError.set(false)"
                    />
                    @if (avatarUrlError()) {
                      <p class="text-xs text-red-500 mt-2">{{ 'PROFILE.INVALID_IMAGE_URL' | translate }}</p>
                    }
                  </div>
                }
              }

              <div class="flex gap-2 pt-2">
                <app-button
                  variant="outline"
                  class="flex-1"
                  (click)="closeAvatarModal()"
                  [disabled]="isSavingAvatar()"
                >
                  {{ 'COMMON.CANCEL' | translate }}
                </app-button>
                <app-button
                  customClass="flex-1 bg-[#155347] hover:bg-[#0d3d31]"
                  (click)="saveAvatar()"
                  [disabled]="!canSaveAvatar() || isSavingAvatar()"
                >
                  {{ isSavingAvatar() ? ('PROFILE.SAVING' | translate) : ('COMMON.SAVE' | translate) }}
                </app-button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Change Password Modal -->
      @if (showPasswordModal()) {
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          (click)="closePasswordModal()"
        >
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            (click)="$event.stopPropagation()"
          >
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{{ 'PROFILE.CHANGE_PASSWORD' | translate }}</h3>
              <button (click)="closePasswordModal()" class="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                <lucide-icon name="x" class="h-5 w-5"></lucide-icon>
              </button>
            </div>

            @if (passwordError()) {
              <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {{ passwordError() }}
              </div>
            }

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ 'PROFILE.CURRENT_PASSWORD' | translate }}</label>
                <div class="relative">
                  <input
                    [type]="showCurrentPassword() ? 'text' : 'password'"
                    [ngModel]="currentPassword()"
                    (ngModelChange)="currentPassword.set($event)"
                    class="w-full h-10 px-4 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                  />
                  <button
                    type="button"
                    (click)="showCurrentPassword.set(!showCurrentPassword())"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <lucide-icon
                      [name]="showCurrentPassword() ? 'eye-off' : 'eye'"
                      class="h-4 w-4"
                    ></lucide-icon>
                  </button>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{{ 'PROFILE.NEW_PASSWORD' | translate }}</label>
                <div class="relative">
                  <input
                    [type]="showNewPassword() ? 'text' : 'password'"
                    [ngModel]="newPassword()"
                    (ngModelChange)="newPassword.set($event)"
                    class="w-full h-10 px-4 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm"
                  />
                  <button
                    type="button"
                    (click)="showNewPassword.set(!showNewPassword())"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <lucide-icon
                      [name]="showNewPassword() ? 'eye-off' : 'eye'"
                      class="h-4 w-4"
                    ></lucide-icon>
                  </button>
                </div>
                <!-- Password requirements -->
                <div class="grid grid-cols-2 gap-2 mt-2">
                  <div
                    [class]="
                      'flex items-center gap-2 text-xs ' +
                      (passwordValidations().length ? 'text-green-600' : 'text-gray-400')
                    "
                  >
                    @if (passwordValidations().length) {
                      <lucide-icon name="check" class="h-3 w-3"></lucide-icon>
                    } @else {
                      <div class="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600"></div>
                    }
                    <span>{{ 'PROFILE.MIN_CHARS' | translate }}</span>
                  </div>
                  <div
                    [class]="
                      'flex items-center gap-2 text-xs ' +
                      (passwordValidations().number ? 'text-green-600' : 'text-gray-400')
                    "
                  >
                    @if (passwordValidations().number) {
                      <lucide-icon name="check" class="h-3 w-3"></lucide-icon>
                    } @else {
                      <div class="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600"></div>
                    }
                    <span>{{ 'PROFILE.AT_LEAST_NUMBER' | translate }}</span>
                  </div>
                  <div
                    [class]="
                      'flex items-center gap-2 text-xs ' +
                      (passwordValidations().special ? 'text-green-600' : 'text-gray-400')
                    "
                  >
                    @if (passwordValidations().special) {
                      <lucide-icon name="check" class="h-3 w-3"></lucide-icon>
                    } @else {
                      <div class="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600"></div>
                    }
                    <span>{{ 'PROFILE.ONE_SPECIAL' | translate }}</span>
                  </div>
                  <div
                    [class]="
                      'flex items-center gap-2 text-xs ' +
                      (passwordValidations().match ? 'text-green-600' : 'text-gray-400')
                    "
                  >
                    @if (passwordValidations().match) {
                      <lucide-icon name="check" class="h-3 w-3"></lucide-icon>
                    } @else {
                      <div class="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600"></div>
                    }
                    <span>{{ 'PROFILE.PASSWORDS_MATCH' | translate }}</span>
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >{{ 'PROFILE.CONFIRM_NEW_PASSWORD' | translate }}</label
                >
                <div class="relative">
                  <input
                    [type]="showConfirmPassword() ? 'text' : 'password'"
                    [ngModel]="confirmNewPassword()"
                    (ngModelChange)="confirmNewPassword.set($event)"
                    [class]="
                      'w-full h-10 px-4 pr-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#155347] text-sm dark:bg-gray-700 dark:text-gray-100 ' +
                      (confirmNewPassword() && !passwordValidations().match
                        ? 'border-red-300'
                        : 'border-gray-300 dark:border-gray-600')
                    "
                  />
                  <button
                    type="button"
                    (click)="showConfirmPassword.set(!showConfirmPassword())"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    <lucide-icon
                      [name]="showConfirmPassword() ? 'eye-off' : 'eye'"
                      class="h-4 w-4"
                    ></lucide-icon>
                  </button>
                </div>
              </div>

              <div class="flex gap-2 pt-2">
                <app-button variant="outline" class="flex-1" (click)="closePasswordModal()">
                  {{ 'COMMON.CANCEL' | translate }}
                </app-button>
                <app-button
                  customClass="flex-1 bg-[#155347] hover:bg-[#0d3d31]"
                  (click)="showPasswordConfirmModal.set(true)"
                  [disabled]="!isPasswordFormValid() || isChangingPassword()"
                >
                  {{ 'PROFILE.CHANGE_PASSWORD' | translate }}
                </app-button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Password Change Confirmation Modal -->
      @if (showPasswordConfirmModal()) {
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
          (click)="showPasswordConfirmModal.set(false)"
        >
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6"
            (click)="$event.stopPropagation()"
          >
            <div class="text-center mb-4">
              <div
                class="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4"
              >
                <lucide-icon name="key" class="h-6 w-6 text-yellow-600"></lucide-icon>
              </div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'PROFILE.CONFIRM_PASSWORD_CHANGE' | translate }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ 'PROFILE.CONFIRM_PASSWORD_DESC' | translate }}
              </p>
            </div>

            <div class="flex gap-2">
              <app-button
                variant="outline"
                class="flex-1"
                (click)="showPasswordConfirmModal.set(false)"
              >
                {{ 'COMMON.CANCEL' | translate }}
              </app-button>
              <app-button
                customClass="flex-1 bg-[#155347] hover:bg-[#0d3d31]"
                (click)="confirmChangePassword()"
                [disabled]="isChangingPassword()"
              >
                {{ isChangingPassword() ? ('PROFILE.CHANGING' | translate) : ('COMMON.CONFIRM' | translate) }}
              </app-button>
            </div>
          </div>
        </div>
      }

      <app-work-in-progress [show]="showWipModal()" (close)="showWipModal.set(false)" />

      <app-modal
        [isOpen]="showDisconnectGoogleModal()"
        [title]="'PROFILE.DISCONNECT_GOOGLE' | translate"
        maxWidth="sm"
        [hasFooter]="true"
        (onClose)="closeDisconnectGoogleModal()"
      >
        <div class="space-y-4">
          <div
            class="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full"
          >
            <lucide-icon name="triangle-alert" class="h-6 w-6 text-yellow-600"></lucide-icon>
          </div>
          <p class="text-center text-gray-600 dark:text-gray-400">
            @if (unlinkLastExternalDeletesAccount()) {
              {{ 'PROFILE.DISCONNECT_GOOGLE_ONLY' | translate }}
            } @else {
              {{ 'PROFILE.DISCONNECT_GOOGLE_SAFE' | translate }}
            }
          </p>
        </div>

        <div footer class="flex gap-3">
          <app-button
            variant="outline"
            (onClick)="closeDisconnectGoogleModal()"
            customClass="flex-1"
            [disabled]="isDisconnectingGoogle()"
          >
            {{ 'COMMON.CANCEL' | translate }}
          </app-button>
          <app-button
            (onClick)="confirmDisconnectGoogle()"
            [customClass]="
              'flex-1 text-white ' +
              (unlinkLastExternalDeletesAccount()
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#155347] hover:bg-[#0d3d31]')
            "
            [disabled]="isDisconnectingGoogle()"
          >
            @if (isDisconnectingGoogle()) {
              <lucide-icon name="loader-circle" class="h-4 w-4 animate-spin mr-2"></lucide-icon>
              {{ 'PROFILE.DISCONNECTING' | translate }}
            } @else {
              {{ 'PROFILE.DISCONNECT' | translate }}
            }
          </app-button>
        </div>
      </app-modal>

      <!-- Save Confirmation Modal -->
      @if (showConfirmModal()) {
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          (click)="showConfirmModal.set(false)"
        >
          <div
            class="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6"
            (click)="$event.stopPropagation()"
          >
            <div class="text-center mb-4">
              <div
                class="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-4"
              >
                <lucide-icon name="triangle-alert" class="h-6 w-6 text-yellow-600"></lucide-icon>
              </div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{{ 'PROFILE.SAVE_CONFIRM_TITLE' | translate }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ 'PROFILE.SAVE_CONFIRM_DESC' | translate }}
              </p>
            </div>

            <div class="flex gap-2">
              <app-button variant="outline" class="flex-1" (click)="showConfirmModal.set(false)">
                {{ 'COMMON.CANCEL' | translate }}
              </app-button>
              <app-button
                customClass="flex-1 bg-[#155347] hover:bg-[#0d3d31]"
                (click)="confirmSaveProfile()"
              >
                {{ 'COMMON.CONFIRM' | translate }}
              </app-button>
            </div>
          </div>
        </div>
      }
    </app-dashboard-layout>
  `,
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private uploadService = inject(UploadService);
  private translateService = inject(TranslateService);

  user = this.authService.currentUser;

  // Form state
  formData = signal({
    fullName: '',
    phoneNumber: '',
    location: '',
    profilePictureUrl: '',
    userName: '',
    bio: '',
    timezone: '',
  });

  // UI state
  successMessage = signal('');
  errorMessage = signal('');
  isSaving = signal(false);
  showAvatarModal = signal(false);
  showPasswordModal = signal(false);
  showConfirmModal = signal(false);
  showPasswordConfirmModal = signal(false);
  showWipModal = signal(false);
  showDisconnectGoogleModal = signal(false);
  isDisconnectingGoogle = signal(false);
  isCheckingExternalAccounts = signal(false);
  googleConnected = signal(false);
  microsoftConnected = signal(false);
  unlinkLastExternalDeletesAccount = signal(false);
  showLogoutModal = signal(false);
  showLogoutAllModal = signal(false);
  avatarUrl = '';
  avatarUrlError = signal(false);
  avatarPreview = signal<string | null>(null);
  uploadMode = signal<'url' | 'file'>('url');
  selectedFile = signal<File | null>(null);
  filePreview = signal<string | null>(null);
  fileError = signal('');
  isDragging = signal(false);

  // Password form (using signals for reactivity)
  currentPassword = signal('');
  newPassword = signal('');
  confirmNewPassword = signal('');
  passwordError = signal('');
  isChangingPassword = signal(false);
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // City autocomplete
  cityResults = signal<string[]>([]);
  showCityDropdown = signal(false);
  highlightedCityIndex = signal(-1);

  // Original values for comparison
  originalData = {
    fullName: '',
    phoneNumber: '',
    location: '',
    profilePictureUrl: '',
    userName: '',
    bio: '',
    timezone: '',
  };

  constructor() {
    // Initialize form with user data reactively
    effect(() => {
      const user = this.user();
      if (!user) {
        this.googleConnected.set(false);
        this.microsoftConnected.set(false);
        this.unlinkLastExternalDeletesAccount.set(false);
        return;
      }

      if (!this.originalData.fullName) {
        this.initializeForm(user);
      }

      void this.loadExternalAccounts();
    });
  }

  private initializeForm(user: any) {
    const data = {
      fullName: user.fullName || '',
      phoneNumber: user.phoneNumber || '',
      location: user.location || '',
      profilePictureUrl: user.profilePictureUrl || '',
      userName: user.userName || '',
      bio: user.bio || '',
      timezone: user.timezone || '',
    };
    this.formData.set(data);
    this.originalData = { ...data };
  }

  updateFormField(field: string, value: string) {
    this.formData.update((current) => ({
      ...current,
      [field]: value,
    }));
    this.clearMessages();
  }

  onLocationInput(value: string): void {
    this.updateFormField('location', value);
    const query = value.trim().toLowerCase();
    if (query.length >= 1) {
      const results = CITIES.filter((c) => c.toLowerCase().includes(query)).slice(0, 8);
      this.cityResults.set(results);
      this.showCityDropdown.set(results.length > 0);
    } else {
      this.cityResults.set([]);
      this.showCityDropdown.set(false);
    }
    this.highlightedCityIndex.set(-1);
  }

  selectCity(city: string): void {
    this.updateFormField('location', city);
    this.cityResults.set([]);
    this.showCityDropdown.set(false);
    this.highlightedCityIndex.set(-1);
  }

  onLocationKeydown(event: KeyboardEvent): void {
    if (!this.showCityDropdown()) return;
    const results = this.cityResults();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedCityIndex.set(Math.min(this.highlightedCityIndex() + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedCityIndex.set(Math.max(this.highlightedCityIndex() - 1, -1));
    } else if (event.key === 'Enter' && this.highlightedCityIndex() >= 0) {
      event.preventDefault();
      this.selectCity(results[this.highlightedCityIndex()]);
    } else if (event.key === 'Escape') {
      this.showCityDropdown.set(false);
      this.highlightedCityIndex.set(-1);
    }
  }

  closeCityDropdown(): void {
    // Delay para permitir que o click no item do dropdown seja registado antes do blur
    setTimeout(() => this.showCityDropdown.set(false), 150);
  }

  hasChanges = computed(() => {
    const current = this.formData();
    return (
      current.fullName !== this.originalData.fullName ||
      current.phoneNumber !== this.originalData.phoneNumber ||
      current.location !== this.originalData.location ||
      current.profilePictureUrl !== this.originalData.profilePictureUrl ||
      current.userName !== this.originalData.userName ||
      current.bio !== this.originalData.bio ||
      current.timezone !== this.originalData.timezone
    );
  });

  formErrors = computed(() => {
    const d = this.formData();
    const errors: Record<string, string> = {};

    const t = (key: string) => this.translateService.instant(`PROFILE.VALIDATION.${key}`);

    // Full Name — obrigatório, 2-50 chars, só letras e pontuação de nome
    const name = d.fullName.trim();
    if (!name) {
      errors['fullName'] = t('FULL_NAME_REQUIRED');
    } else if (name.length < 2) {
      errors['fullName'] = t('MIN_2_CHARS');
    } else if (name.length > 50) {
      errors['fullName'] = t('MAX_50_CHARS');
    } else if (!/^[a-zA-ZÀ-ÿ\s'\-]+$/.test(name)) {
      errors['fullName'] = t('FULL_NAME_INVALID');
    }

    // Username - só validar se foi alterado pelo utilizador
    const username = d.userName.trim();
    if (username && username !== this.originalData.userName) {
      if (username.length < 3) {
        errors['userName'] = t('MIN_3_CHARS');
      } else if (!/^[a-zA-Z0-9_@]+$/.test(username)) {
        errors['userName'] = t('USERNAME_INVALID');
      }
    }

    // Phone — opcional; se preenchido: formato internacional básico (7-20 chars)
    const phone = d.phoneNumber.trim();
    if (phone && !/^\+?[\d\s\-(). ]{7,20}$/.test(phone)) {
      errors['phoneNumber'] = t('PHONE_INVALID');
    }

    // Location - opcional; se preenchido: 2-100 chars, sem caracteres estranhos
    const location = d.location.trim();
    if (location) {
      if (location.length < 2) {
        errors['location'] = t('MIN_2_CHARS');
      } else if (location.length > 100) {
        errors['location'] = t('MAX_100_CHARS');
      } else if (!/^[a-zA-ZÀ-ÿ0-9\s,.\-']+$/.test(location)) {
        errors['location'] = t('LOCATION_INVALID');
      }
    }

    return errors;
  });

  isFormValid = computed(() => Object.keys(this.formErrors()).length === 0);

  resetForm() {
    this.formData.set({ ...this.originalData });
    this.avatarPreview.set(null);
    this.clearMessages();
  }

  showSaveConfirmation() {
    if (!this.isFormValid()) return;
    this.showConfirmModal.set(true);
  }

  async confirmSaveProfile() {
    this.showConfirmModal.set(false);
    await this.saveProfile();
  }

  async saveProfile() {
    this.isSaving.set(true);
    this.clearMessages();

    const current = this.formData();
    const request: any = {};

    // Only include changed fields
    if (current.fullName !== this.originalData.fullName) {
      request.fullName = current.fullName;
    }
    if (current.phoneNumber !== this.originalData.phoneNumber) {
      request.phoneNumber = current.phoneNumber;
    }
    if (current.location !== this.originalData.location) {
      request.location = current.location;
    }
    if (current.profilePictureUrl !== this.originalData.profilePictureUrl) {
      request.profilePictureUrl = current.profilePictureUrl;
    }
    if (current.userName !== this.originalData.userName) {
      request.userName = current.userName;
    }
    if (current.bio !== this.originalData.bio) {
      request.bio = current.bio;
    }
    if (current.timezone !== this.originalData.timezone) {
      request.timezone = current.timezone;
    }

    const result = await this.authService.updateProfile(request);

    if (result.success) {
      this.successMessage.set(result.message || this.translateService.instant('TOASTS.PROFILE_UPDATED'));
      // Update original data to reflect saved state
      this.originalData = { ...current };
      this.avatarPreview.set(null);
    } else {
      this.errorMessage.set(
        result.errors?.join(', ') || result.message || this.translateService.instant('TOASTS.PROFILE_UPDATE_FAILED'),
      );
    }

    this.isSaving.set(false);
    this.autoHideMessages();
  }

  // Avatar methods
  closeAvatarModal() {
    this.showAvatarModal.set(false);
    this.avatarUrl = '';
    this.avatarUrlError.set(false);
    this.uploadMode.set('file');
    this.selectedFile.set(null);
    this.filePreview.set(null);
    this.fileError.set('');
    this.isDragging.set(false);
  }

  isSavingAvatar = signal(false);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;
    this.processFile(file);
  }

  private processFile(file: File) {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.fileError.set('Invalid file type. Please select a JPEG, PNG, GIF or WebP image.');
      this.selectedFile.set(null);
      this.filePreview.set(null);
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      this.fileError.set('File is too large. Maximum size is 2MB.');
      this.selectedFile.set(null);
      this.filePreview.set(null);
      return;
    }

    this.fileError.set('');
    this.selectedFile.set(file);

    // Convert to base64 for preview
    const reader = new FileReader();
    reader.onload = () => {
      this.filePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  canSaveAvatar(): boolean {
    if (this.uploadMode() === 'file') {
      return !!this.filePreview() && !this.fileError();
    } else {
      return !!this.avatarUrl && !this.avatarUrlError();
    }
  }

  async saveAvatar() {
    if (!this.canSaveAvatar()) return;

    this.isSavingAvatar.set(true);

    let profilePictureUrl: string;

    try {
      if (this.uploadMode() === 'file') {
        // Upload ficheiro para o servidor e usar URL devolvida
        const file = this.selectedFile()!;
        const uploadResult = await firstValueFrom(this.uploadService.uploadImage(file));
        profilePictureUrl = uploadResult.url;
      } else {
        // Usar URL externa diretamente
        profilePictureUrl = this.avatarUrl;
      }
    } catch {
      this.errorMessage.set('Failed to upload image. Please try again.');
      this.isSavingAvatar.set(false);
      this.autoHideMessages();
      return;
    }

    const result = await this.authService.updateProfile({
      profilePictureUrl,
    });

    if (result.success) {
      // Update local state to reflect saved value
      this.formData.update((current) => ({
        ...current,
        profilePictureUrl,
      }));
      this.originalData.profilePictureUrl = profilePictureUrl;
      this.avatarPreview.set(null);
      this.successMessage.set(this.translateService.instant('TOASTS.PROFILE_PICTURE_UPDATED'));
      this.closeAvatarModal();
      this.autoHideMessages();
    } else {
      this.errorMessage.set(
        result.errors?.join(', ') || result.message || this.translateService.instant('TOASTS.PROFILE_PICTURE_UPDATE_FAILED'),
      );
      this.autoHideMessages();
    }

    this.isSavingAvatar.set(false);
  }

  onAvatarError() {
    this.avatarPreview.set(null);
  }

  // Password methods
  closePasswordModal() {
    this.showPasswordModal.set(false);
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmNewPassword.set('');
    this.passwordError.set('');
    this.showCurrentPassword.set(false);
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
  }

  // Password validation (same rules as registration)
  passwordValidations = computed(() => {
    const pwd = this.newPassword();
    const confirmPwd = this.confirmNewPassword();
    return {
      length: pwd.length >= 8,
      number: /\d/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      match: pwd === confirmPwd && pwd !== '',
    };
  });

  isPasswordFormValid(): boolean {
    const v = this.passwordValidations();
    return this.currentPassword().length > 0 && v.length && v.number && v.special && v.match;
  }

  async confirmChangePassword() {
    if (!this.isPasswordFormValid()) return;

    this.isChangingPassword.set(true);
    this.passwordError.set('');

    const result = await this.authService.changePassword({
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
      confirmPassword: this.confirmNewPassword(),
    });

    if (result.success) {
      this.successMessage.set(this.translateService.instant('PROFILE.PASSWORD_CHANGED_SUCCESS'));
      this.showPasswordConfirmModal.set(false);
      this.closePasswordModal();
      this.autoHideMessages();
    } else {
      this.showPasswordConfirmModal.set(false);
      this.passwordError.set(
        result.errors?.join(', ') || result.message || this.translateService.instant('PROFILE.PASSWORD_CHANGED_FAILED'),
      );
    }

    this.isChangingPassword.set(false);
  }

  async connectGoogle(): Promise<void> {
    if (this.googleConnected()) {
      return;
    }

    // Vincula Google à conta atual, sem trocar de utilizador autenticado.
    this.authService.linkExternalLogin('google', '/profile');
  }

  async disconnectGoogle(): Promise<void> {
    this.showDisconnectGoogleModal.set(true);
  }

  closeDisconnectGoogleModal(): void {
    this.showDisconnectGoogleModal.set(false);
  }

  async confirmDisconnectGoogle(): Promise<void> {
    this.isDisconnectingGoogle.set(true);
    const result = await this.authService.unlinkExternalLogin('google');
    this.isDisconnectingGoogle.set(false);
    this.showDisconnectGoogleModal.set(false);

    if (!result) {
      this.errorMessage.set('Failed to disconnect Google account.');
      this.autoHideMessages();
      return;
    }

    if (result.accountDeleted) {
      this.successMessage.set('Google disconnected and your account was deleted.');
      this.autoHideMessages();
      await this.authService.logout();
      return;
    }

    this.successMessage.set(result.message || 'Google disconnected successfully.');
    await this.loadExternalAccounts();
    this.autoHideMessages();
  }

  connectMicrosoft(): void {
    if (this.microsoftConnected()) {
      return;
    }

    this.showWipModal.set(true);
  }

  private async loadExternalAccounts(): Promise<void> {
    this.isCheckingExternalAccounts.set(true);

    const data = await this.authService.getExternalLogins();
    if (data) {
      const linked = new Set(data.linkedProviders.map((p) => p.provider.toLowerCase()));
      this.googleConnected.set(linked.has('google'));
      this.microsoftConnected.set(linked.has('microsoft'));
      this.unlinkLastExternalDeletesAccount.set(data.unlinkLastExternalDeletesAccount);
    } else {
      this.unlinkLastExternalDeletesAccount.set(false);
    }

    this.isCheckingExternalAccounts.set(false);
  }

  // Utility methods
  private clearMessages() {
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  private autoHideMessages() {
    setTimeout(() => {
      this.successMessage.set('');
      this.errorMessage.set('');
    }, 5000);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const locale = this.translateService.getCurrentLang();
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  confirmLogout(): void {
    this.showLogoutModal.set(false);
    this.authService.logout();
  }

  confirmLogoutAll(): void {
    this.showLogoutAllModal.set(false);
    this.authService.logoutAll();
  }
}
