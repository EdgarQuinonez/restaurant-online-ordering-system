export interface MenuItem {
  id: number;
  name: string;
  category: string;
  type: 'food' | 'drink';
  imgSrc: string;
  imgAlt: string;
  sizes: Size[];
}

export interface Size {
  id: number;
  order: number;
  name: string;
  description: string;
  price: number;
  menu_item: number;
}

export interface Category {
  name: string;
  type: 'food' | 'drink';
}
