import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  async getMmps() {
    return firstValueFrom(this.http.get('/data/mmp.json')) as Promise<any[]>;
  }

  async getPeople() {
    return firstValueFrom(this.http.get('/data/people.json')) as Promise<any[]>;
  }

  async getLocations() {
    return firstValueFrom(this.http.get('/data/locations.json')) as Promise<any[]>;
  }
}
