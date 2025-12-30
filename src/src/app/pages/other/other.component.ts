import { Component, OnInit, signal } from '@angular/core';
import { DataService } from '../../services/data.service';
import { MmpCardComponent } from '../../components/mmp-card/mmp-card.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-other',
  standalone: true,
  imports: [CommonModule, MmpCardComponent],
  templateUrl: './other.component.html',
  styleUrls: ['./other.component.css']
})
export class OtherPageComponent implements OnInit {
  mmps = signal<any[]>([]);
  people = signal<any[]>([]);
  locations = signal<any[]>([]);
  constructor(private ds: DataService) {}
  async ngOnInit() {
    const [m, p, l] = await Promise.all([this.ds.getMmps(), this.ds.getPeople(), this.ds.getLocations()]);
    // Sort by id descending (most recent first)
    this.mmps.set([...m].sort((a, b) => b.id - a.id));
    this.people.set(p);
    this.locations.set(l);
  }
}
