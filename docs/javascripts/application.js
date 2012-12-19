$(function() {
  prettyPrint();
  $('.style-switch').click(function() {
    var newClass
      , newLogo;
    if ($('html').hasClass('style-dark')) {
      newClass = 'style-light';
      newLogo  = 'images/logo-dark.png';
    } else {
      newClass = 'style-dark';
      newLogo  = 'images/logo.png';
    }

    $('html').removeClass().addClass(newClass);
    $('img.logo').attr({ src: newLogo });
  });
}); 