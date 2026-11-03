import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CartService } from './cart.service';
@Component({
  selector: 'cart-badge',
  template: `<a href="/cart" class="badge" [class.empty]="count === 0">{{ count }}</a>`
})
export class CartBadgeComponent implements OnInit, OnDestroy {
  count = 0; private sub?: Subscription;
  constructor(private cart: CartService) {}
  ngOnInit() { this.sub = this.cart.count$.subscribe(c => (this.count = c)); }
  ngOnDestroy() { this.sub?.unsubscribe(); }
}
