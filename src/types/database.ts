export interface Farm {
  id: string
  user_id: string
  name: string
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  total_area_ha: number | null
  created_at: string
}

export interface Herd {
  id: string
  farm_id: string
  name: string
  species: string
  head_count: number
  main_phase: string
  forage_id: string | null
  breed_id: string | null
  avg_weight_kg: number | null
  sex: string | null
  pasture_condition: string | null
  profile_completeness: number
  current_product_id: string | null
  created_at: string
  forage?: Forage
  breed?: Breed
  product?: Product
}

export interface Forage {
  id: string
  name: string
  category: string
}

export interface Breed {
  id: string
  name: string
  category: string
  aptitude: string
}

export interface Product {
  id: string
  name: string
  line: string
  species: string
}

