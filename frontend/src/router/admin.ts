import type { RouteRecordRaw } from "vue-router";
import { newsDocs } from "../services/cms/catalog";
export const adminRoutes: RouteRecordRaw[] = [
  {
    path: "/admin",
    component: () => import("../views/admin/AdminGate.vue"),
    meta: {
      requiresAdmin: true,
      adminLayout: true,
      title: "admin.nav.overview",
    },
    children: [
      { path: "", redirect: {path: "/admin/appointments", query: {}, hash: ""} },
      {path:"appointments/new",component:()=>import("../views/admin/AdminAppointmentsView.vue"),meta:{title:"operations.manual",adminSection:"appointments",createAppointment:true}},
      {path:"appointments",component:()=>import("../views/admin/AdminAppointmentsView.vue"),meta:{title:"operations.appointments",adminSection:"appointments"}},
      {path:"doctors",component:()=>import("../views/admin/AdminDoctorsView.vue"),meta:{adminSection:"doctors",title:"admin.nav.doctors"}},
      {path:"doctors/profile/:editorialKey(clinic\\.doctorBio)",component:()=>import("../views/admin/AdminDoctorSetup.vue"),meta:{adminSection:"doctors",title:"doctors.information"}},
      {path:"doctors/new",component:()=>import("../views/admin/AdminDoctorSetup.vue"),meta:{adminSection:"doctors",title:"simple.addDoctor"}},
      {path:"doctors/manage/:doctorID",component:()=>import("../views/admin/AdminDoctorSetup.vue"),meta:{adminSection:"doctors",title:"operations.doctorName"}},
      {path:"news/new",component:()=>import("../views/admin/AdminCreatedContentView.vue"),meta:{adminSection:"news",contentKind:"news",title:"simple.addNews"}},
      {path:"news/edit/:key",component:()=>import("../views/admin/AdminCreatedContentView.vue"),meta:{adminSection:"news",contentKind:"news",title:"created.news"}},
      // Explicit approved news identities: no generic CMS route or arbitrary document editor.
      ...["news",...newsDocs.map(doc=>"news/"+encodeURIComponent(doc.key))].map(path=>({path,component:()=>import("../views/admin/AdminCmsView.vue"),meta:{adminSection:"news",title:"admin.nav.news"}})),
      {path:"doctors/:legacy(.*)*",redirect:{path:"/admin/doctors",query:{},hash:""}},
      {path:"news/:legacy(.*)*",redirect:{path:"/admin/news",query:{},hash:""}},
      { path: ":pathMatch(.*)*", redirect: {path: "/admin/appointments", query: {}, hash: ""} },
    ],
  },
];
