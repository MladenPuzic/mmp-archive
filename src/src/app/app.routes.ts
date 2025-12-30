import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { OtherPageComponent } from './pages/other/other.component';
import { HallPageComponent } from './pages/hall/hall.component';
import { ParticipantPageComponent } from './pages/participant/participant.component';
import { ParticipantsPageComponent } from './pages/participants/participants.component';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', component: HomeComponent },
	{ path: 'other', component: OtherPageComponent },
	{ path: 'hall', component: HallPageComponent },
	{ path: 'participants', component: ParticipantsPageComponent },
	{ path: 'participant/:id', component: ParticipantPageComponent },
	{ path: '**', redirectTo: '' }
];
