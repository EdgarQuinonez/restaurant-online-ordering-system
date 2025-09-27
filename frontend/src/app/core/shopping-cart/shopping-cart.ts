import { Component } from '@angular/core';
import { ActionBar } from './action-bar/action-bar';

@Component({
  selector: 'app-shopping-cart',
  imports: [ActionBar],
  templateUrl: './shopping-cart.html',
  styleUrl: './shopping-cart.css',
})
export class ShoppingCart {}
