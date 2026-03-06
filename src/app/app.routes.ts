import { Routes } from '@angular/router';
import { EnterEmailComponent } from './features/enter-email/enter-email.component';
import { LandingComponent } from './features/landing/landing.component';
import { SurveyComponent } from './features/survey/survey.component';
import { ThankYouComponent } from './features/thank-you/thank-you.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'enter-email/:slug', component: EnterEmailComponent },
  { path: 'survey/:slug/:surveyCode', component: SurveyComponent },
  { path: 'thank-you', component: ThankYouComponent },
  { path: '**', redirectTo: '' }
];
