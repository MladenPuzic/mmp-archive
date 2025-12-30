import { Component, OnInit, signal } from '@angular/core';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hall',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './hall.component.html',
  styleUrls: ['./hall.component.css']
})
export class HallPageComponent implements OnInit {
  topHosts = signal<Array<{ id: number; name: string; count: number; rank: string }>>([]);
  participants = signal<Array<{ id: number; name: string; count: number; rank: string }>>([]);
  locationsList = signal<Array<{ name: string; count: number; rank: string }>>([]);
  constructor(private ds: DataService) {}

  // Calculate ranks with ties (e.g., "3-6" for tied positions)
  private assignRanks<T extends { count: number }>(items: T[]): Array<T & { rank: string }> {
    const result: Array<T & { rank: string }> = [];
    let i = 0;
    while (i < items.length) {
      const currentCount = items[i].count;
      // Find all items with same count
      let j = i;
      while (j < items.length && items[j].count === currentCount) {
        j++;
      }
      // i to j-1 share the same rank
      const startRank = i + 1;
      const endRank = j;
      const rankStr = startRank === endRank ? `${startRank}` : `${startRank}-${endRank}`;
      for (let k = i; k < j; k++) {
        result.push({ ...items[k], rank: rankStr });
      }
      i = j;
    }
    return result;
  }

  async ngOnInit() {
    const [mmps, people, locations] = await Promise.all([
      this.ds.getMmps(), this.ds.getPeople(), this.ds.getLocations()
    ]);

    // hosts
    const hostCounts: Record<number, number> = {};
    for (const m of mmps) hostCounts[m.hostId] = (hostCounts[m.hostId] || 0) + 1;
    const hostArr = Object.entries(hostCounts).map(([id, count]) => ({ id: Number(id), count }));
    hostArr.sort((a, b) => b.count - a.count);
    const hostData = hostArr.map(x => ({ id: x.id, name: people.find(p => p.id === x.id)?.name ?? '—', count: x.count }));
    this.topHosts.set(this.assignRanks(hostData));

    // participants (appearance count) — include hosts, but count each person at most once per canonical MMP
    const partCounts: Record<number, number> = {};
    for (const m of mmps) {
      if (!m.canon) continue; // only count canonical MMPs
      const seen = new Set<number>();
      if (m.hostId != null) seen.add(m.hostId);
      for (const c of m.cast || []) {
        if (c && c.userId != null) seen.add(c.userId);
      }
      for (const uid of Array.from(seen)) {
        partCounts[uid] = (partCounts[uid] || 0) + 1;
      }
    }
    const partArr = Object.entries(partCounts).map(([id, count]) => ({ id: Number(id), count }));
    partArr.sort((a, b) => b.count - a.count);
    const partData = partArr.map(x => ({ id: x.id, name: people.find(p => p.id === x.id)?.name ?? '—', count: x.count }));
    this.participants.set(this.assignRanks(partData));

    // locations - only count canonical mmps
    const locCountsCanon: Record<number, number> = {};
    for (const m of mmps) {
      if (!m.canon) continue;
      locCountsCanon[m.locationId] = (locCountsCanon[m.locationId] || 0) + 1;
    }
    const locArrCanon = Object.entries(locCountsCanon).map(([id, count]) => ({ id: Number(id), count }));
    locArrCanon.sort((a, b) => b.count - a.count);
    const locData = locArrCanon.map(x => ({ name: locations.find(l => l.id === x.id)?.name ?? '—', count: x.count }));
    this.locationsList.set(this.assignRanks(locData));
  }
}
