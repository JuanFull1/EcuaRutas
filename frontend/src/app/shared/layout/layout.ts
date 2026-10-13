import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class Layout {

  private readonly authService =
    inject(AuthService);

  readonly menuAbierto =
    signal(false);

  readonly usuario =
    this.authService.usuarioActual;

  toggleMenu(): void {
    this.menuAbierto.update(
      valor => !valor
    );
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}