import { Component, input } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly type = input<'submit' | 'button'>('submit');
  readonly disabled = input(false);
  readonly variant = input<'primary' | 'secondary'>('primary');
}
