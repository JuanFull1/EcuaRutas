import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
  cargando = false;
  mostrarPassword = false;

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

    this.formulario.valueChanges.subscribe(() => {
      if (this.error) {
        this.error = '';
      }
    });
  }

  iniciarSesion(): void {

    this.error = '';

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (this.cargando) {
      return;
    }

    this.cargando = true;

    const datos =
      this.formulario.getRawValue();

    this.authService
      .login(
        datos.correo.trim(),
        datos.password
      )
      .subscribe({
        next: respuesta => {

          this.cargando = false;

          const ruta =
            this.authService.obtenerRutaInicio(
              respuesta.usuario.rol
            );

          this.router.navigateByUrl(ruta);
        },

        error: (error: HttpErrorResponse) => {

          this.cargando = false;

          if (error.status === 401) {
            this.error =
              'Correo o contraseña incorrectos.';
            return;
          }

          if (error.status === 0) {
            this.error =
              'No se pudo conectar con el servidor.';
            return;
          }

          this.error =
            error.error?.message ??
            'Ocurrió un error al iniciar sesión.';
        }
      });
  }

  alternarPassword(): void {
    this.mostrarPassword =
      !this.mostrarPassword;
  }
}