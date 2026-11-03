import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class CartService {
  private items$ = new BehaviorSubject<{ sku: string; qty: number }[]>([]);
  readonly count$ = this.items$.pipe(/* map to total qty */);
  add(sku: string) { const cur = this.items$.value; this.items$.next([...cur, { sku, qty: 1 }]); }
  snapshot() { return this.items$.value; }
}
