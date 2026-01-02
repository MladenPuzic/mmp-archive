import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';

interface MmpAppearance {
  mmpId: number;
  code: string;
  title: string;
  date: string;
  role: string | null;
  isHost: boolean;
}

interface PersonStats {
  id: number;
  name: string;
  totalAppearances: number;
  timesHosted: number;
  appearances: MmpAppearance[];
  characters: Array<{ role: string; mmpCode: string; mmpTitle: string }>;
}

@Component({
  selector: 'app-participant',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './participant.component.html',
  styleUrls: ['./participant.component.css']
})
export class ParticipantPageComponent implements OnInit {
  person = signal<PersonStats | null>(null);
  allPeople = signal<Array<{ id: number; name: string }>>([]);
  loading = signal(true);
  notFound = signal(false);

  constructor(private route: ActivatedRoute, private ds: DataService) {}

  async ngOnInit() {
    const [mmps, people] = await Promise.all([
      this.ds.getMmps(),
      this.ds.getPeople()
    ]);

    this.allPeople.set(people);

    // Subscribe to route param changes
    this.route.paramMap.subscribe(async params => {
      const idParam = params.get('id');
      if (!idParam) {
        this.loading.set(false);
        this.notFound.set(true);
        return;
      }

      const personId = parseInt(idParam, 10);
      const person = people.find(p => p.id === personId);

      if (!person) {
        this.loading.set(false);
        this.notFound.set(true);
        return;
      }

      // Calculate stats
      const appearances: MmpAppearance[] = [];
      const characters: Array<{ role: string; mmpCode: string; mmpTitle: string }> = [];
      let timesHosted = 0;

      for (const mmp of mmps) {
        const isHost = (mmp.hostIds || []).includes(personId);
        const castEntry = (mmp.cast || []).find((c: any) => c.userId === personId);

        if (isHost || castEntry) {
          appearances.push({
            mmpId: mmp.id,
            code: mmp.code,
            title: mmp.title,
            date: mmp.date,
            role: castEntry?.role || null,
            isHost
          });

          if (isHost) {
            timesHosted++;
          }

          if (castEntry?.role) {
            characters.push({
              role: castEntry.role,
              mmpCode: mmp.code,
              mmpTitle: mmp.title
            });
          }
        }
      }

      // Sort appearances by date (newest first)
      appearances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      this.person.set({
        id: personId,
        name: person.name,
        totalAppearances: appearances.length,
        timesHosted,
        appearances,
        characters
      });

      this.loading.set(false);
      this.notFound.set(false);
    });
  }
}
