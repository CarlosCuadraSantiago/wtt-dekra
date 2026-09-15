import { LowerCasePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  imports: [LowerCasePipe, RouterLink],
  selector: 'app-users-placeholder',
  template: `
    <section style="padding: 1rem;">
      <h2>{{ title() }}</h2>
      <p>Placeholder for {{ title() | lowercase }} — to be implemented with Signal Forms + UsersService.</p>
      <a routerLink="/users">Back to list</a>
    </section>
  `,
})
export class UsersPlaceholder {
  private readonly route = inject(ActivatedRoute);
  readonly title = computed(() => (this.route.snapshot.data['title'] as string) ?? 'Users');
}
