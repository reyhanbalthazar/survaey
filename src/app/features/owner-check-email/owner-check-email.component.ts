import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-owner-check-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-check-email.component.html',
  styleUrl: './owner-check-email.component.css'
})
export class OwnerCheckEmailComponent {
  readonly email: string;

  constructor(private readonly route: ActivatedRoute) {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
  }
}

