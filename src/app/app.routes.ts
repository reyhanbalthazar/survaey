import { Routes } from '@angular/router';
import { EnterEmailComponent } from './features/enter-email/enter-email.component';
import { InvalidLinkComponent } from './features/invalid-link/invalid-link.component';
import { LandingPageComponent } from './features/landing-page/landing-page.component';
import { OwnerCheckEmailComponent } from './features/owner-check-email/owner-check-email.component';
import { OwnerDashboardComponent } from './features/owner-dashboard/owner-dashboard.component';
import { OwnerLayoutComponent } from './features/owner-layout/owner-layout.component';
import { OwnerLoginComponent } from './features/owner-login/owner-login.component';
import { OwnerRegisterComponent } from './features/owner-register/owner-register.component';
import { OwnerResponsesComponent } from './features/owner-responses/owner-responses.component';
import { OwnerSurveyCreateComponent } from './features/owner-survey-create/owner-survey-create.component';
import { OwnerVerifyEmailComponent } from './features/owner-verify-email/owner-verify-email.component';
import { OwnerVouchersComponent } from './features/owner-vouchers/owner-vouchers.component';
import { OwnerWalletComponent } from './features/owner-wallet/owner-wallet.component';
import { SurveyComponent } from './features/survey/survey.component';
import { ThankYouComponent } from './features/thank-you/thank-you.component';
import { ownerAuthGuard } from './core/guards/owner-auth.guard';

export const routes: Routes = [
  { path: 'owner/login', component: OwnerLoginComponent },
  { path: 'owner/register', component: OwnerRegisterComponent },
  { path: 'owner/check-email', component: OwnerCheckEmailComponent },
  { path: 'owner/verify-email', component: OwnerVerifyEmailComponent },
  {
    path: 'owner',
    component: OwnerLayoutComponent,
    canActivate: [ownerAuthGuard],
    children: [
      { path: 'dashboard', component: OwnerDashboardComponent },
      { path: 'surveys/new', component: OwnerSurveyCreateComponent },
      { path: 'surveys/:id/edit', component: OwnerSurveyCreateComponent },
      { path: 'surveys/:id/responses', component: OwnerResponsesComponent },
      { path: 'vouchers', component: OwnerVouchersComponent },
      { path: 'wallet', component: OwnerWalletComponent },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },
  { path: 'survey/:publicToken', component: EnterEmailComponent },
  { path: 'survey/:publicToken/form', component: SurveyComponent },
  { path: 'survey/:publicToken/done', component: ThankYouComponent },
  { path: '', component: LandingPageComponent },
  { path: '**', component: InvalidLinkComponent }
];
