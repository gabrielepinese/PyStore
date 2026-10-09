import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-dot-loader',
  imports: [TranslocoPipe],
  templateUrl: './dot-loader.html',
  styleUrl: './dot-loader.scss',
})
export class DotLoader {}
