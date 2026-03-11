<script lang="ts">
  interface Props {
    label?: string;
    value?: string | number;
    placeholder?: string;
    type?: 'text' | 'number' | 'email' | 'password' | 'tel' | 'url';
    name?: string;
    id?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    helper?: string;
    min?: number;
    max?: number;
    step?: number;
    class?: string;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
    onblur?: (e: Event) => void;
    onkeydown?: (e: KeyboardEvent) => void;
  }

  let {
    label,
    value = $bindable(''),
    placeholder = '',
    type = 'text',
    name,
    id,
    required = false,
    disabled = false,
    error,
    helper,
    min,
    max,
    step,
    class: className = '',
    oninput,
    onchange,
    onblur,
    onkeydown,
  }: Props = $props();

  let inputId = $derived(id || `input-${Math.random().toString(36).slice(2)}`);
</script>

<div class="w-full {className}">
  {#if label}
    <label for={inputId} class="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
      {#if required}
        <span class="text-danger-500">*</span>
      {/if}
    </label>
  {/if}
  
  <input
    {type}
    {name}
    id={inputId}
    bind:value
    {placeholder}
    {required}
    {disabled}
    {min}
    {max}
    {step}
    class="w-full px-4 py-2.5 bg-white border {error ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'} 
      rounded-xl text-gray-900 placeholder-gray-400
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
    oninput={oninput}
    onchange={onchange}
    onblur={onblur}
    onkeydown={onkeydown}
  />
  
  {#if error}
    <p class="mt-1.5 text-sm text-danger-600 flex items-center gap-1">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      {error}
    </p>
  {:else if helper}
    <p class="mt-1.5 text-sm text-gray-500">{helper}</p>
  {/if}
</div>
