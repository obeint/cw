import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('./views/EntitiesView.vue') },
    { path: '/entity/:id', component: () => import('./views/EntityDetailView.vue'), props: true },
    { path: '/graph', component: () => import('./views/GraphView.vue') },
    { path: '/lineage/:id?', component: () => import('./views/LineageView.vue'), props: true },
    { path: '/places', component: () => import('./views/PlacesView.vue') },
    { path: '/timeline', component: () => import('./views/TimelineView.vue') },
    { path: '/settings', component: () => import('./views/SettingsView.vue') },
    { path: '/backup', redirect: '/settings' },
  ],
});
