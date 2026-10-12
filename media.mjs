export const media = {
  signature: {src:'assets/signature-black.jpg',alt:'Luxe Fade Lounge lettering and barber pole worked into a black precision haircut',width:937,height:1678,caption:'01 / The signature'},
  case: {src:'assets/signed-case.jpg',alt:'Anthony Sessa’s black barber case with chrome trim and its original athlete autographs',width:1088,height:1280,caption:'02 / The signed case'},
  anthony: {src:'assets/anthony-at-work.jpg',alt:'Anthony Sessa working on a client’s haircut with his open barber case beside him',width:982,height:1280,caption:'03 / Anthony at work'},
  private: {src:'assets/case-detail.svg',alt:'Anthony Sessa’s signed barber case, with black texture and chrome trim',width:1088,height:900,ratio:'6/5',displayLabel:'THE WORKING KIT / ON YOUR TERMS'},
  lounge: {src:'assets/lounge.svg',alt:'Luxe Fade Lounge interior with geometric ceiling lights and black lounge seating',width:285,height:398,caption:'04 / The lounge'}
};
export const galleryPhotos = ['signature','case','anthony','lounge'].map(key=>media[key]);
