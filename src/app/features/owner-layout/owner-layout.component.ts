import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { OwnerAuthService } from '../../core/services/owner-auth.service';

@Component({
  selector: 'app-owner-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './owner-layout.component.html',
  styleUrl: './owner-layout.component.css'
})
export class OwnerLayoutComponent {
  constructor(
    private readonly authService: OwnerAuthService,
    private readonly router: Router
  ) {}

  get userName(): string {
    return this.authService.getCurrentUser()?.name ?? 'Owner';
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/owner/login']);
  }
}

