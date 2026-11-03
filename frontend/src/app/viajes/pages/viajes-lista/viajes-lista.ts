import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { mensajeError } from '../../../shared/http-error';
import { Viaje } from '../../models/viaje.model';
import { ViajesApiService } from '../../services/viajes-api.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-viajes-lista', standalone: true, imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './viajes-lista.html'
})
export class ViajesLista implements OnInit {
  private readonly api = inject(ViajesApiService);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly viajes = signal<Viaje[]>([]);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly aviso = signal('');
  
  buses: any[] = [];
  filtro: any = { desde: null, hasta: null, estado: null, busId: null }; 

  ngOnInit(): void { 
    this.cargarBuses();
    this.cargar(); 
  }

  cargarBuses(): void {
    const cooperativaId = this.authService.usuarioActual()?.cooperativaId;
    if (!cooperativaId) return;
    const params = new HttpParams().set('cooperativaId', cooperativaId);
    
    this.http.get<any[]>('http://localhost:5268/api/buses', { params }).subscribe({
      next: res => { 
        this.buses = res; 
        this.cdr.detectChanges(); 
      }
    });
  }

  cargar(): void {
    this.cargando.set(true); 
    this.error.set('');
    this.api.listar(this.filtro).subscribe({
      next: v => { this.viajes.set(v); this.cargando.set(false); },
      error: e => { this.error.set(mensajeError(e)); this.cargando.set(false); }
    });
  }

  abrir(v: Viaje): void { 
    this.ejecutar(this.api.cambiarEstado(v.id, 'ABIERTO'), 'Viaje abierto.'); 
  }
  
  cancelar(v: Viaje): void { 
    if (window.confirm('¿Cancelar este viaje?')) {
      this.ejecutar(this.api.cancelar(v.id), 'Viaje cancelado.'); 
    }
  }

  private ejecutar(accion: Observable<Viaje>, ok: string): void {
    this.error.set(''); this.aviso.set('');
    accion.subscribe({
      next: () => { this.aviso.set(ok); this.cargar(); },
      error: e => this.error.set(mensajeError(e))
    });
  }
}