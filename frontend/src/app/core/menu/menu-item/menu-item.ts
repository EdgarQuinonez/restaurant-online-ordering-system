import { Component, input, signal, computed } from '@angular/core';
import { Size } from '@core/menu/menu.service.interface';

@Component({
  selector: 'app-menu-item',
  templateUrl: './menu-item.html',
})
export class MenuItem {
  // Input signals
  name = input.required<string>();
  src = input.required<string>();
  alt = input.required<string>();
  category = input.required<string>();
  type = input.required<'food' | 'drink'>();
  sizes = input.required<Size[]>();

  // Internal state
  selectedSizeId = signal<number | null>(null);

  // Computed properties
  sortedSizes = computed(() => {
    const sizes = this.sizes();
    return sizes.slice().sort((a, b) => a.order - b.order);
  });

  selectedSize = computed(() => {
    const sortedSizes = this.sortedSizes();
    const selectedId = this.selectedSizeId();
    return (
      sortedSizes.find((size) => size.id === selectedId) ||
      sortedSizes[0] ||
      null
    );
  });

  selectedSizeDescription = computed(() => {
    return this.selectedSize()?.description || '';
  });

  formattedPrice = computed(() => {
    const price = this.selectedSize()?.price;
    if (price !== undefined) {
      return `$${price}`;
    }
    return '';
  });

  ngOnInit() {
    // Auto-select first size by default (after sorting)
    const sortedSizes = this.sortedSizes();
    if (sortedSizes && sortedSizes.length > 0) {
      this.selectedSizeId.set(sortedSizes[0].id);
    }
  }

  selectSize(sizeId: number): void {
    this.selectedSizeId.set(sizeId);
  }
}
