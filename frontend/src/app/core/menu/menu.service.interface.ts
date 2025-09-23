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
  price: string;
  menu_item: number;
}
