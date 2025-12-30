import { Component, OnInit, signal } from '@angular/core';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';
import { MmpCardComponent } from '../../components/mmp-card/mmp-card.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, MmpCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  mmps = signal<any[]>([]);
  people = signal<any[]>([]);
  locations = signal<any[]>([]);
  loading = signal(true);
  constructor(private ds: DataService) {}
  async ngOnInit() {
    const [m, p, l] = await Promise.all([this.ds.getMmps(), this.ds.getPeople(), this.ds.getLocations()]);
    // Sort by id descending (most recent first)
    this.mmps.set([...m].sort((a, b) => b.id - a.id));
    this.people.set(p);
    this.locations.set(l);
    this.loading.set(false);
  }
}
