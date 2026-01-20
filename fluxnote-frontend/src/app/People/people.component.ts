import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-people',
  templateUrl: './people.component.html'
})
export class PeopleComponent implements OnInit {
  public people: Person[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.getPeople();
  }

  getPeople() {
    this.http.get<Person[]>('/api/people').subscribe(
      (result) => {
        this.people = result;
      },
      (error) => {
        console.error(error);
      }
    );
  }
}

interface Person {
  personId: number;
  name: string;
  age: number;
}



