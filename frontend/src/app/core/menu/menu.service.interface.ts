export interface MenuItem {
  id: number;
  name: string;
  category: string;
  type: 'food' | 'drink';
  sizes: Size[];
}

export interface Size {
  id: number;
  name: string;
  desc: string;
  price: number;
}
