import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  error = '';

  readonly formulario;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {

    this.formulario =
      this.formBuilder.nonNullable.group({

        correo: [
          '',
          [
            Validators.required,
            Validators.email
          ]
        ],

        password: [
          '',
          Validators.required
        ]

      });
  }

  iniciarSesion(): void {

    this.error = '';

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos =
      this.formulario.getRawValue();

    const autenticado =
      this.authService.login(
        datos.correo,
        datos.password
      );

    if (!autenticado) {

      this.error =
        'Correo o contraseña incorrectos.';

      return;
    }

    const usuario =
      this.authService.usuarioActual();

    switch (usuario?.rol) {

      case 'ADMIN':
        this.router.navigate(['/admin/inicio']);
        break;

      case 'COOPERATIVA':
        this.router.navigate(['/cooperativas']);
        break;

      case 'OFICINISTA':
        this.router.navigate(['/ventas']);
        break;

      case 'CLIENTE':
        this.router.navigate(['/cliente']);
        break;

      case 'BUS':
        this.router.navigate(['/personal-bus']);
        break;

      default:
        this.router.navigate(['/login']);
        break;
    }
  }
}