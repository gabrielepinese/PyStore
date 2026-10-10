import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faCcAmex, faCcMastercard, faCcVisa } from '@fortawesome/free-brands-svg-icons';
import {
  faAngleLeft,
  faBoxOpen,
  faChevronDown,
  faCreditCard,
  faLocationDot,
  faLock,
  faPen,
  faPlus,
  faRotate,
  faStar,
  faTrash,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AccountService } from '../../core/account/account.service';
import { AuthService } from '../../core/auth/auth.service';
import { Address } from '../../core/models/address.model';
import { PaymentMethod } from '../../core/models/payment-method.model';
import { DotLoader } from '../../shared/components/dot-loader/dot-loader';
import { Topbar } from '../../shared/components/topbar/topbar';
import { ConfirmDialogService } from '../../shared/services/confirm-dialog.service';
import { ToastService } from '../../shared/services/toast.service';
import { COUNTRIES, ITALIAN_CITIES } from '../../shared/data/italy';
import { DEFAULT_PHONE_PREFIX, PHONE_PREFIXES } from '../../shared/data/phone-prefixes';
import { joinPhone, PHONE_NUMBER_PATTERN, POSTAL_CODE_PATTERN, splitPhone } from '../../shared/utils/phone';
import {
  cardNumberValidator,
  cvvLengthForBrand,
  cvvValidator,
  detectCardBrand,
  normalizeCardNumber,
} from '../../shared/utils/card-number';

/** Brand name (as returned by the backend, or detected client-side) → its FontAwesome mark. */
const CARD_BRAND_ICONS: Record<string, IconDefinition> = {
  Visa: faCcVisa,
  Mastercard: faCcMastercard,
  'American Express': faCcAmex,
};

type Section = 'profile' | 'addresses' | 'payment' | 'orders';

const CURRENT_YEAR = new Date().getFullYear();

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule, FaIconComponent, DotLoader, Topbar, TranslocoPipe],
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class Account {
  protected readonly icons = {
    angleLeft: faAngleLeft,
    boxOpen: faBoxOpen,
    chevronDown: faChevronDown,
    card: faCreditCard,
    location: faLocationDot,
    lock: faLock,
    pen: faPen,
    plus: faPlus,
    rotate: faRotate,
    star: faStar,
    trash: faTrash,
    user: faUser,
  };

  protected readonly cardYears = Array.from({ length: 16 }, (_, i) => CURRENT_YEAR + i);
  protected readonly cardMonths = Array.from({ length: 12 }, (_, i) => i + 1);
  protected readonly phonePrefixes = PHONE_PREFIXES;
  protected readonly cities = ITALIAN_CITIES;
  protected readonly countries = COUNTRIES;

  protected readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly transloco = inject(TranslocoService);

  protected readonly section = signal<Section>('profile');

  // ---- profile ----

  protected readonly profileForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phonePrefix: [DEFAULT_PHONE_PREFIX],
    phoneNumber: ['', Validators.pattern(PHONE_NUMBER_PATTERN)],
    country: ['', Validators.required],
    city: ['', Validators.required],
  });
  protected readonly savingProfile = signal(false);

  constructor() {
    const user = this.authService.currentUser();
    const { prefix, number } = splitPhone(user?.phone ?? null);
    this.profileForm.setValue({
      fullName: user?.fullName ?? '',
      lastName: user?.lastName ?? '',
      phonePrefix: prefix,
      phoneNumber: number,
      country: user?.country ?? '',
      city: user?.city ?? '',
    });

    this.loadAddresses();
    this.loadPaymentMethods();

    // The CVV's valid length depends on the brand, which isn't known until
    // the card number is typed and recognized — so the field stays locked
    // until then, instead of silently accepting the wrong length.
    effect(() => {
      const cvvControl = this.cardForm.controls.cvv;
      if (this.typedCardBrand()) {
        if (cvvControl.disabled) {
          cvvControl.enable({ emitEvent: false });
        }
      } else if (cvvControl.enabled) {
        cvvControl.disable({ emitEvent: false });
      }
    });
  }

  protected setSection(section: Section): void {
    this.addressFormOpen.set(false);
    this.cardFormOpen.set(false);
    this.section.set(section);
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid || this.savingProfile()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);

    const { fullName, lastName, phonePrefix, phoneNumber, country, city } = this.profileForm.getRawValue();
    this.authService
      .updateProfile({
        fullName,
        lastName,
        phone: joinPhone(phonePrefix, phoneNumber),
        country,
        city,
      })
      .subscribe({
        next: () => {
          this.savingProfile.set(false);
          this.toastService.show(this.transloco.translate('toast.profileUpdated'), 'success');
        },
        error: () => {
          this.savingProfile.set(false);
          this.toastService.show(this.transloco.translate('toast.profileUpdateFailed'), 'error');
        },
      });
  }

  // ---- addresses ----

  protected readonly addresses = signal<Address[]>([]);
  protected readonly addressesLoading = signal(true);
  protected readonly addressFormOpen = signal(false);
  protected readonly editingAddressId = signal<string | null>(null);
  protected readonly savingAddress = signal(false);

  protected readonly addressForm = this.fb.nonNullable.group({
    label: ['', Validators.required],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phonePrefix: [DEFAULT_PHONE_PREFIX],
    phoneNumber: ['', Validators.pattern(PHONE_NUMBER_PATTERN)],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    postalCode: ['', [Validators.required, Validators.pattern(POSTAL_CODE_PATTERN)]],
    country: [COUNTRIES[0], Validators.required],
    isDefault: [false],
  });

  private loadAddresses(): void {
    this.addressesLoading.set(true);
    this.accountService.listAddresses().subscribe({
      next: (list) => {
        this.addresses.set(list);
        this.addressesLoading.set(false);
      },
      error: () => this.addressesLoading.set(false),
    });
  }

  protected openNewAddressForm(): void {
    this.editingAddressId.set(null);
    this.addressForm.reset({
      label: '',
      fullName: '',
      phonePrefix: DEFAULT_PHONE_PREFIX,
      phoneNumber: '',
      line1: '',
      line2: '',
      city: '',
      postalCode: '',
      country: COUNTRIES[0],
      isDefault: this.addresses().length === 0,
    });
    this.addressFormOpen.set(true);
  }

  protected editAddress(address: Address): void {
    this.editingAddressId.set(address.id);
    const { prefix, number } = splitPhone(address.phone);
    this.addressForm.setValue({
      label: address.label,
      fullName: address.fullName,
      phonePrefix: prefix,
      phoneNumber: number,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      isDefault: address.isDefault,
    });
    this.addressFormOpen.set(true);
  }

  protected cancelAddressForm(): void {
    this.addressFormOpen.set(false);
  }

  protected saveAddress(): void {
    if (this.addressForm.invalid || this.savingAddress()) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.savingAddress.set(true);
    const raw = this.addressForm.getRawValue();
    const { phonePrefix, phoneNumber, ...rest } = raw;
    const data = {
      ...rest,
      phone: joinPhone(phonePrefix, phoneNumber),
      line2: raw.line2.trim() || null,
    };
    const id = this.editingAddressId();
    const request = id
      ? this.accountService.updateAddress(id, data)
      : this.accountService.createAddress(data);

    const isEditing = !!id;
    request.subscribe({
      next: () => {
        this.savingAddress.set(false);
        this.addressFormOpen.set(false);
        this.loadAddresses();
        this.toastService.show(
          this.transloco.translate(isEditing ? 'toast.addressUpdated' : 'toast.addressAdded'),
          'success',
        );
      },
      error: () => {
        this.savingAddress.set(false);
        this.toastService.show(this.transloco.translate('toast.addressSaveFailed'), 'error');
      },
    });
  }

  protected async confirmDeleteAddress(address: Address): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: this.transloco.translate('account.addresses.deleteConfirmTitle'),
      description: this.transloco.translate('account.addresses.deleteConfirmDescription', {
        label: address.label,
      }),
      confirmLabel: this.transloco.translate('account.addresses.remove'),
      tone: 'danger',
    });
    if (confirmed) {
      this.deleteAddress(address.id);
    }
  }

  private deleteAddress(id: string): void {
    this.accountService.deleteAddress(id).subscribe({
      next: () => {
        this.loadAddresses();
        this.toastService.show(this.transloco.translate('toast.addressRemoved'), 'success');
      },
      error: () => this.toastService.show(this.transloco.translate('toast.addressRemoveFailed'), 'error'),
    });
  }

  // ---- payment methods ----

  protected readonly cards = signal<PaymentMethod[]>([]);
  protected readonly cardsLoading = signal(true);
  protected readonly cardFormOpen = signal(false);
  protected readonly savingCard = signal(false);
  protected readonly cardError = signal<string | null>(null);

  protected readonly cardForm = this.fb.nonNullable.group(
    {
      cardNumber: ['', [Validators.required, cardNumberValidator]],
      cvv: ['', [Validators.required]],
      cardholderName: ['', [Validators.required, Validators.minLength(2)]],
      expMonth: [1, Validators.required],
      expYear: [CURRENT_YEAR, Validators.required],
      isDefault: [false],
    },
    { validators: cvvValidator },
  );

  /** Backs the live card preview + the brand icon in the number field — one source, both read from it. */
  private readonly cardFormValue = toSignal(this.cardForm.valueChanges, {
    initialValue: this.cardForm.getRawValue(),
  });

  /** True while the preview shows the back (CVV focused, or flipped manually). */
  protected readonly previewFlipped = signal(false);

  protected readonly typedCardBrand = computed(() =>
    detectCardBrand(normalizeCardNumber(this.cardFormValue().cardNumber ?? '')),
  );

  /** Live brand icon as the user types, shown both inside the number field and in the card preview. */
  protected readonly typedCardIcon = computed(() => this.brandIcon(this.typedCardBrand() ?? ''));

  protected readonly cvvMaxLength = computed(() => cvvLengthForBrand(this.typedCardBrand()));

  protected readonly cardNumberPreview = computed(() => {
    const digits = normalizeCardNumber(this.cardFormValue().cardNumber ?? '');
    if (!digits) {
      return '•••• •••• •••• ••••';
    }
    const padded = digits.length < 16 ? digits + '•'.repeat(16 - digits.length) : digits;
    return padded.match(/.{1,4}/g)?.join(' ') ?? padded;
  });

  protected readonly cardholderPreview = computed(() => this.cardFormValue().cardholderName?.trim() || null);

  protected readonly cardExpiryPreview = computed(() => {
    const { expMonth, expYear } = this.cardFormValue();
    return expMonth && expYear ? `${expMonth.toString().padStart(2, '0')}/${expYear.toString().slice(-2)}` : '••/••';
  });

  protected readonly cvvPreview = computed(() => {
    const cvv = this.cardFormValue().cvv ?? '';
    const length = this.cvvMaxLength();
    return (cvv + '•'.repeat(length)).slice(0, length);
  });

  protected brandIcon(brand: string): IconDefinition | undefined {
    return CARD_BRAND_ICONS[brand];
  }

  /** Blocks any non-digit keystroke outright — letters, spaces, dashes never reach the field. */
  protected onDigitsOnlyKeypress(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  /** Paste fallback: strips anything non-digit from the clipboard instead of blocking the paste entirely. */
  protected onCardNumberPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    const digits = pasted.replace(/\D/g, '');
    if (digits.length === pasted.length) {
      return;
    }

    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const merged = (input.value.slice(0, start) + digits + input.value.slice(end)).slice(0, 19);
    this.cardForm.controls.cardNumber.setValue(merged);
  }

  /** Last-resort net for anything keypress/paste don't catch (autofill, IME, drag-and-drop text). */
  protected onCardNumberInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 19);
    if (digitsOnly !== raw) {
      this.cardForm.controls.cardNumber.setValue(digitsOnly);
    }
  }

  private loadPaymentMethods(): void {
    this.cardsLoading.set(true);
    this.accountService.listPaymentMethods().subscribe({
      next: (list) => {
        this.cards.set(list);
        this.cardsLoading.set(false);
      },
      error: () => this.cardsLoading.set(false),
    });
  }

  protected openNewCardForm(): void {
    this.cardError.set(null);
    this.cardForm.reset({
      cardNumber: '',
      cvv: '',
      cardholderName: '',
      expMonth: 1,
      expYear: CURRENT_YEAR,
      isDefault: this.cards().length === 0,
    });
    this.previewFlipped.set(false);
    this.cardFormOpen.set(true);
  }

  protected cancelCardForm(): void {
    this.cardFormOpen.set(false);
  }

  protected saveCard(): void {
    if (this.cardForm.invalid || this.savingCard()) {
      this.cardForm.markAllAsTouched();
      return;
    }

    this.savingCard.set(true);
    this.cardError.set(null);

    const raw = this.cardForm.getRawValue();
    this.accountService.createPaymentMethod({
      ...raw,
      cardNumber: normalizeCardNumber(raw.cardNumber),
    }).subscribe({
      next: () => {
        this.savingCard.set(false);
        this.cardFormOpen.set(false);
        this.loadPaymentMethods();
        this.toastService.show(this.transloco.translate('toast.cardAdded'), 'success');
      },
      error: () => {
        this.savingCard.set(false);
        this.cardError.set(this.transloco.translate('account.payment.cardErrorDetailed'));
        this.toastService.show(this.transloco.translate('toast.cardSaveFailed'), 'error');
      },
    });
  }

  protected setDefaultCard(id: string): void {
    this.accountService.setDefaultPaymentMethod(id).subscribe({
      next: () => {
        this.loadPaymentMethods();
        this.toastService.show(this.transloco.translate('toast.defaultPaymentUpdated'), 'success');
      },
      error: () =>
        this.toastService.show(this.transloco.translate('toast.defaultPaymentUpdateFailed'), 'error'),
    });
  }

  protected async confirmDeleteCard(card: PaymentMethod): Promise<void> {
    const confirmed = await this.confirmDialogService.confirm({
      title: this.transloco.translate('account.payment.deleteConfirmTitle'),
      description: this.transloco.translate('account.payment.deleteConfirmDescription', {
        brand: card.brand,
        last4: card.last4,
      }),
      confirmLabel: this.transloco.translate('account.payment.remove'),
      tone: 'danger',
    });
    if (confirmed) {
      this.deleteCard(card.id);
    }
  }

  private deleteCard(id: string): void {
    this.accountService.deletePaymentMethod(id).subscribe({
      next: () => {
        this.loadPaymentMethods();
        this.toastService.show(this.transloco.translate('toast.cardRemoved'), 'success');
      },
      error: () => this.toastService.show(this.transloco.translate('toast.cardRemoveFailed'), 'error'),
    });
  }

  // ---- nav ----

  protected goBack(): void {
    this.router.navigateByUrl('/dashboard');
  }
}
