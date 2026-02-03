import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
// 1. Importamos las animaciones
import { trigger, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-ubication',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ubication.component.html',
  styleUrls: ['./ubication.component.css'],
  // 2. Definimos la animación igual que en el Home
  animations: [
    trigger('menuAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class UbicationComponent {
  isOpen = false;

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }

  closeMenu() {
    this.isOpen = false;
  }
}