import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-participants',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './participants.component.html',
  styleUrls: ['./participants.component.css']
})
export class ParticipantsPageComponent implements OnInit {
  people = signal<Array<{ id: number; name: string; appearances: number }>>([]);
  loading = signal(true);

  constructor(private ds: DataService) {}

  async ngOnInit() {
    const [mmps, people] = await Promise.all([
      this.ds.getMmps(),
      this.ds.getPeople()
    ]);

    // Count appearances for each person
    const appearanceCounts: Record<number, number> = {};
    for (const mmp of mmps) {
      const seen = new Set<number>();
      if (mmp.hostId != null) seen.add(mmp.hostId);
      for (const c of mmp.cast || []) {
        if (c && c.userId != null) seen.add(c.userId);
      }
      for (const uid of Array.from(seen)) {
        appearanceCounts[uid] = (appearanceCounts[uid] || 0) + 1;
      }
    }

    // Map people with their appearance counts and sort alphabetically
    const peopleWithCounts = people.map(p => ({
      id: p.id,
      name: p.name,
      appearances: appearanceCounts[p.id] || 0
    })).sort((a, b) => a.name.localeCompare(b.name));

    this.people.set(peopleWithCounts);
    this.loading.set(false);
  }
}
