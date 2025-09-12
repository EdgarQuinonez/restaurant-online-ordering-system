export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  type: 'food' | 'beverage';
}
