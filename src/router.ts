import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./views/EntitiesView.vue') },
    { path: '/entity/:id', component: () => import('./views/EntityDetailView.vue'), props: true },
    { path: '/graph', component: () => import('./views/GraphView.vue') },
    { path: '/lineage/:id?', component: () => import('./views/LineageView.vue'), props: true },
    { path: '/places', component: () => import('./views/PlacesView.vue') },
    { path: '/backup', component: () => import('./views/BackupView.vue') },
  ],
});
