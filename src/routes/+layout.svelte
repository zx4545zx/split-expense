<script lang="ts">
  import '../app.css';
  import { Toast, PWAInstall } from '$lib/components';
  
  let { children } = $props();
</script>

<svelte:head>
  <title>Split Expense - หารค่าใช้จ่าย</title>
  <meta name="description" content="แอพหารค่าใช้จ่ายสำหรับท่องเที่ยว กินข้าว หรือกิจกรรมต่างๆ">
  
  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#3b82f6">
  <meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1e3a8a" media="(prefers-color-scheme: dark)">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="Split Expense">
  <meta name="application-name" content="Split Expense">
  <meta name="msapplication-TileColor" content="#3b82f6">
  <meta name="msapplication-config" content="/browserconfig.xml">
  
  <!-- Viewport -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  
  <!-- Manifest -->
  <link rel="manifest" href="/manifest.json">
  
  <!-- Favicon SVG -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  
  <!-- Apple Touch Icon -->
  <link rel="apple-touch-icon" href="/icons/icon.svg">
  
  <!-- Safari Pinned Tab -->
  <link rel="mask-icon" href="/favicon.svg" color="#3b82f6">
  
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai+Looped:wght@100;200;300;400;500;600;700&family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">
</svelte:head>

<Toast />
<PWAInstall />

<div class="min-h-screen bg-gray-50 font-ibm-plex">
  {@render children()}
</div>
