import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
@Component({
  selector: 'app-order-summary', changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3>{{ 'order.summary' | translate }}</h3>
    <p>{{ 'order.placed' | translate: { date: (order.placedAt | date: 'longDate') } }}</p>
    <p class="total">{{ order.total | currency: order.currency }}</p>
    <p *ngIf="order.items.length === 1">{{ 'order.oneItem' | translate }}</p>
    <p *ngIf="order.items.length !== 1">{{ 'order.nItems' | translate: { n: order.items.length } }}</p>`
})
export class OrderSummaryComponent { @Input() order!: { placedAt: string; total: number; currency: string; items: unknown[] }; }
