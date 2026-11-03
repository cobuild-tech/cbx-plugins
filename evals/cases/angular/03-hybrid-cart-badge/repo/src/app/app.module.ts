import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { UpgradeModule, downgradeComponent, downgradeInjectable } from '@angular/upgrade/static';
import { CartBadgeComponent } from './cart-badge.component';
import { CartService } from './cart.service';
declare const angular: any;
angular.module('shop')
  .directive('cartBadge', downgradeComponent({ component: CartBadgeComponent }))
  .factory('cartService', downgradeInjectable(CartService));
@NgModule({ imports: [BrowserModule, UpgradeModule], declarations: [CartBadgeComponent] })
export class AppModule { constructor(private upgrade: UpgradeModule) {} ngDoBootstrap() { this.upgrade.bootstrap(document.body, ['shop']); } }
