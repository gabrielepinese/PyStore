import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [TranslocoPipe],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  protected readonly confirmDialogService = inject(ConfirmDialogService);

  protected cancel(): void {
    this.confirmDialogService.respond(false);
  }

  protected confirm(): void {
    this.confirmDialogService.respond(true);
  }
}
