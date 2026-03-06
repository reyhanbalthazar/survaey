import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SurveyService } from '../../core/services/survey.service';
import { Organization } from '../../models/organization.model';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent implements OnInit {
  organizations: Organization[] = [];
  loading = true;

  constructor(
    private readonly surveyService: SurveyService,
    private readonly router: Router,
    private readonly title: Title,
    private readonly meta: Meta
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Survey Platform - Customer Feedback');
    this.meta.updateTag({
      name: 'description',
      content: 'Fill survey quickly and securely from your mobile or desktop browser.'
    });
    this.meta.updateTag({ property: 'og:title', content: 'Survey Platform' });
    this.meta.updateTag({
      property: 'og:description',
      content: 'Simple, fast and dynamic online survey platform.'
    });

    this.surveyService.getOrganizations().subscribe({
      next: (response) => {
        this.organizations = response.data ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  goToEmailPage(slug: string): void {
    this.router.navigate(['/enter-email', slug]);
  }
}
