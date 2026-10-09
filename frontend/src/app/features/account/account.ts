import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import {
  faAngleLeft,
  faBoxOpen,
  faChevronDown,
  faCreditCard,
  faLocationDot,
  faPen,
  faPlus,
  faStar,
  faTrash,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AccountService } from '../../core/account/account.service';
import { AuthService } from '../../core/auth/auth.service';
import { Address } from '../../core/models/address.model';
import { PaymentMethod } from '../../core/models/payment-method.model';
import { DotLoader } from '../../shared/components/dot-loader/dot-loader';
import { Topbar } from '../../shared/components/topbar/topbar';
import { ToastService } from '../../shared/services/toast.service';
import { COUNTRIES, ITALIAN_CITIES } from '../../shared/data/italy';
import { DEFAULT_PHONE_PREFIX, PHONE_PREFIXES } from '../../shared/data/phone-prefixes';
import { joinPhone, PHONE_NUMBER_PATTERN, POSTAL_CODE_PATTERN, splitPhone } from '../../shared/utils/phone';

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
    pen: faPen,
    plus: faPlus,
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
  private readonly transloco = inject(TranslocoService);

  protected readonly section = signal<Section>('profile');

  // ---- profile ----

  protected readonly profileForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    phonePrefix: [DEFAULT_PHONE_PREFIX],
    phoneNumber: ['', Validators.pattern(PHONE_NUMBER_PATTERN)],
  });
  protected readonly savingProfile = signal(false);

  constructor() {
    const user = this.authService.currentUser();
    const { prefix, number } = splitPhone(user?.phone ?? null);
    this.profileForm.setValue({ fullName: user?.fullName ?? '', phonePrefix: prefix, phoneNumber: number });

    this.loadAddresses();
    this.loadPaymentMethods();
  }

  protected setSection(section: Section): void {
    this.section.set(section);
  }

  protected saveProfile(): void {
    if (this.profileForm.invalid || this.savingProfile()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);

    const { fullName, phonePrefix, phoneNumber } = this.profileForm.getRawValue();
    this.authService.updateProfile({ fullName, phone: joinPhone(phonePrefix, phoneNumber) }).subscribe({
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

  protected deleteAddress(id: string): void {
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

  protected readonly cardForm = this.fb.nonNullable.group({
    cardNumber: ['', [Validators.required, Validators.pattern(/^[\d\s-]{12,24}$/)]],
    cardholderName: ['', [Validators.required, Validators.minLength(2)]],
    expMonth: [1, Validators.required],
    expYear: [CURRENT_YEAR, Validators.required],
    isDefault: [false],
  });

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
      cardholderName: '',
      expMonth: 1,
      expYear: CURRENT_YEAR,
      isDefault: this.cards().length === 0,
    });
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

    this.accountService.createPaymentMethod(this.cardForm.getRawValue()).subscribe({
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

  protected deleteCard(id: string): void {
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
