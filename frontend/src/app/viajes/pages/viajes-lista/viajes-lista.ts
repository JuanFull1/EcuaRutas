import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { mensajeError } from '../../../shared/http-error';
import { Viaje } from '../../models/viaje.model';
import { ViajesApiService } from '../../services/viajes-api.service';

@Component({
  selector: 'app-viajes-lista', standalone: true, imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './viajes-lista.html'
})
export class ViajesLista implements OnInit {
  private readonly api = inject(ViajesApiService);
  readonly viajes = signal<Viaje[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  filtro = { desde: '', hasta: '', estado: '', busId: null as number | null };
  editandoId: number | null = null;
  nuevoUsuarioBusId: number | null = null;

  ngOnInit(): void { this.cargar(); }
  cargar(): void {
    this.cargando.set(true); this.error.set('');
    this.api.listar(this.filtro).subscribe({
      next: v => { this.viajes.set(v); this.cargando.set(false); },
      error: e => { this.error.set(mensajeError(e)); this.cargando.set(false); }
    });
  }
  abrir(v: Viaje): void { this.ejecutar(this.api.cambiarEstado(v.id, 'ABIERTO'), 'Viaje abierto.'); }
  cancelar(v: Viaje): void { if (window.confirm('¿Cancelar este viaje?')) this.ejecutar(this.api.cancelar(v.id), 'Viaje cancelado.'); }
  editarUsuario(v: Viaje): void { this.editandoId = v.id; this.nuevoUsuarioBusId = v.usuarioBusId; }
  guardarUsuario(v: Viaje): void {
    if (!this.nuevoUsuarioBusId) { this.error.set('Indica el id del usuario BUS.'); return; }
    this.ejecutar(this.api.reasignarUsuarioBus(v.id, this.nuevoUsuarioBusId), 'Usuario BUS asignado.');
  }
  private ejecutar(accion: Observable<Viaje>, ok: string): void {
    this.error.set(''); this.aviso.set('');
    accion.subscribe({
      next: () => { this.editandoId = null; this.aviso.set(ok); this.cargar(); },
      error: e => this.error.set(mensajeError(e))
    });
  }
}