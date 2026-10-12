import { services, bookingBase } from './services.mjs';
import { media, galleryPhotos } from './media.mjs';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let selected = services[0];
let lastLounge = selected.id;
function selectService(id) {
  const service = services.find(item=>item.id===id);
  if(!service) return;
  const changed = selected.id !== service.id;
  selected = service;
  if(service.category==='lounge') lastLounge = service.id;
  document.querySelectorAll('[data-category]').forEach(tab=>{const active=tab.dataset.category===service.category;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  ['menu','booking'].forEach(scope=>{
    ['lounge','private'].forEach(category=>{document.querySelector(`#${scope}-${category}-panel`).hidden=category!==service.category;});
  });
  document.querySelectorAll('input[name="menu-service"],input[name="booking-service"]').forEach(input=>{input.checked=input.value===id;input.closest('.service-option').classList.toggle('is-selected',input.checked);});
  document.querySelectorAll('[data-summary-name]').forEach(element=>element.textContent=service.name);
  document.querySelectorAll('[data-summary-price]').forEach(element=>element.textContent=`$${service.price}${service.qualifier?'*':''}`);
  document.querySelectorAll('[data-summary-description]').forEach(element=>element.textContent=service.description);
  document.querySelectorAll('[data-summary-duration]').forEach(element=>element.textContent=service.duration);
  document.querySelectorAll('[data-summary-category]').forEach(element=>element.textContent=service.category==='lounge'?'AT THE LOUNGE':'PRIVATE HOUSE CALL');
  document.querySelectorAll('[data-summary-qualifier]').forEach(element=>{element.hidden=!service.qualifier;element.textContent=service.qualifier??'';});
  document.querySelector('[data-menu-range]').textContent=service.category==='lounge'?'4 lounge services · $40–$60':'Private house calls · $150*';
  const summaryImage=document.querySelector('[data-summary-image]');
  const photo=service.category==='private'?media.private:media.signature;
  summaryImage.src=photo.src;
  summaryImage.alt=photo.alt;
  summaryImage.width=photo.width;summaryImage.height=photo.height;
  summaryImage.classList.toggle('is-private-photo',service.category==='private');
  const credit=document.querySelector('[data-summary-credit]');
  credit.hidden=!photo.credit;
  if(photo.credit){credit.textContent=photo.credit;credit.href=photo.creditUrl;}
  document.querySelector('[data-summary-location]').textContent=service.category==='private'?'Private house call':'At the lounge';
  document.querySelectorAll('[data-booking-label]').forEach(element=>element.textContent=service.category==='private'?'Book your house call':'Choose your time');
  if(changed && !reducedMotion.matches){document.querySelectorAll('[data-summary-price],[data-summary-name]').forEach(element=>element.animate([{opacity:.35,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'cubic-bezier(.2,.7,.3,1)'}));}
  document.querySelectorAll('[data-booking-link]').forEach(link=>link.href=`${bookingBase}/${service.route}`);
  document.querySelector('[data-drawer-note]').textContent=service.qualifier?`${service.duration} · Final price varies by distance.`:`${service.duration} · Select an available time on Square.`;
  const shortNames={regular:'Regular haircut',eyebrows:'Fade / eyebrows',beard:'Fade / beard',kids:'Kids haircut',house:'Private house call'};
  document.querySelector('[data-mobile-summary]').textContent=`${shortNames[service.id]} · $${service.price}${service.qualifier?'*':''}`;
}
function selectCategory(category) { selectService(category==='private'?'house':lastLounge); }
document.querySelectorAll('input[name="menu-service"],input[name="booking-service"]').forEach(input=>input.addEventListener('change',()=>selectService(input.value)));
document.querySelectorAll('[data-category]').forEach(tab=>{
  tab.addEventListener('click',()=>selectCategory(tab.dataset.category));
  tab.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const tabs=[...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
    const target=event.key==='Home'?tabs[0]:event.key==='End'?tabs[1]:tabs[(tabs.indexOf(tab)+1)%tabs.length];
    selectCategory(target.dataset.category);target.focus();
  });
});
selectService(selected.id);
const bookingDialog=document.querySelector('#booking-dialog');
const navDialog=document.querySelector('#nav-dialog');
const galleryDialog=document.querySelector('#gallery-dialog');
const dialogs=[bookingDialog,navDialog,galleryDialog];
function syncBody(){document.body.classList.toggle('dialog-open',dialogs.some(dialog=>dialog.open));}
function openDialog(dialog){dialogs.forEach(other=>{if(other!==dialog&&other.open)other.close();});if(!dialog.open)dialog.showModal();syncBody();if(dialog===bookingDialog){requestAnimationFrame(()=>{const choice=dialog.querySelector('input:checked');choice?.closest('.service-option').scrollIntoView({block:'nearest',inline:'nearest',behavior:reducedMotion.matches?'auto':'smooth'});});}}
document.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.book==='private')selectCategory('private');openDialog(bookingDialog);}));
document.querySelector('.menu-toggle').addEventListener('click',()=>openDialog(navDialog));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.close).close()));
dialogs.forEach(dialog=>{
  dialog.addEventListener('close',syncBody);
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
});
navDialog.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>navDialog.close()));
let galleryIndex=0;
function showGallery(index){galleryIndex=(index+galleryPhotos.length)%galleryPhotos.length;const photo=galleryPhotos[galleryIndex];document.querySelector('#gallery-image').src=photo.src;document.querySelector('#gallery-image').alt=photo.alt;document.querySelector('#gallery-caption').textContent=photo.caption;const credit=document.querySelector('#gallery-credit');credit.hidden=!photo.credit;if(photo.credit){credit.textContent=photo.credit;credit.href=photo.creditUrl;}else{credit.removeAttribute('href');credit.textContent='';}}
document.querySelectorAll('[data-gallery]').forEach(button=>button.addEventListener('click',()=>{showGallery(Number(button.dataset.gallery));openDialog(galleryDialog);}));
document.querySelector('#gallery-prev').addEventListener('click',()=>showGallery(galleryIndex-1));
document.querySelector('#gallery-next').addEventListener('click',()=>showGallery(galleryIndex+1));
galleryDialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();showGallery(galleryIndex+1);}if(event.key==='ArrowLeft'){event.preventDefault();showGallery(galleryIndex-1);}});
const header=document.querySelector('.header');let queued=false;
function updateHeader(){header.classList.toggle('scrolled',scrollY>40);queued=false;}
addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(updateHeader);}},{passive:true});updateHeader();
if('IntersectionObserver' in window){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){document.querySelectorAll('[data-nav]').forEach(link=>{if(link.dataset.nav===entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}}},{rootMargin:'-20% 0px -55% 0px',threshold:0});
  document.querySelectorAll('main>section[id]').forEach(section=>observer.observe(section));
}
document.querySelector('#year').textContent=new Date().getFullYear();
