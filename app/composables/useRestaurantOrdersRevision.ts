// app/composables/useRestaurantOrdersRevision.ts
// A counter the restaurant layout bumps whenever one of its orders changes (via Realtime).
// Order pages include it in their data watch, so they refetch live.
export const useRestaurantOrdersRevision = () => useState('restaurant-orders-revision', () => 0)
