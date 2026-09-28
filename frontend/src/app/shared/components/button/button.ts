import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
  imports: [FaIconComponent],
})
export class Button {
  protected readonly arrowRight = faArrowRight;

  readonly type = input<'submit' | 'button'>('submit');
  readonly disabled = input(false);
  readonly variant = input<'primary' | 'secondary'>('primary');
}
