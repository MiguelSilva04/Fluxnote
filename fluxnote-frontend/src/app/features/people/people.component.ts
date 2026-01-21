import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface Person {
  personId: number;
  name: string;
  age: number;
}

@Component({
  selector: 'app-people',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './people.component.html'
})
export class PeopleComponent implements OnInit {
  private http = inject(HttpClient);
  public people: Person[] = [];

  ngOnInit() {
    this.getPeople();
  }

  getPeople() {
    this.http.get<Person[]>('/api/people').subscribe({
      next: (result) => {
        this.people = result;
      },
      error: (error) => {
        console.error(error);
      }
    });
  }
}



