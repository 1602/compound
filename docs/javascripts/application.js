$(function() {
  prettyPrint();

  /**
   * Handle style switch clicking
   */
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

  /**
   * Shows / hides the sidebar depending on mouse x position
   */
  $(document).mousemove(function (e) {
    var mouseX = e.pageX;
    var windowW = $(window).width();
    if (mouseX <= windowW / 4) {
      $('.sidebar').removeClass('hidden');
    } else {
      $('.sidebar').addClass('hidden');
    }
  });

  /**
   * Generates the sidebar navigation from all headlines
   * and gives them numbers
   */

  var sidebarNavi = {
    build: function() {
      var self = this;
      var decimals = [0, 0, 0];
      var currentLevelItems = [null, null, null];
      $('h1, h2, h3').each(function (headlineIndex, headline) {
        var $headline = $(headline);

        var section = $headline.closest('section')
          , headlineText = $headline.text()
          , level;
        if ($headline.is('h1')) {
          decimals[0] ++;
          decimals[1] = 0;
          decimals[2] = 0;

          level = 0;
        } else if ($headline.is('h2')) {
          decimals[1] ++;
          decimals[2] = 0;

          level = 1;
        } else if ($headline.is('h3')) {
          decimals[2] ++;
          level = 2;
        }

        var text = $headline.text();
        var decimal = self.buildDecimalString(decimals) + ' ';
        var decimalSpan = $('<span>').addClass('decimal').text(decimal);
        $headline.prepend(decimalSpan);

        self.addListItem(level, section.attr('id'), text, decimal)
      });
    },
    addListItem: function (level, id, text, decimal) {
      var li = $('<li>').appendTo($('.sidebar ul.items'));
      var a = $('<a>')
        .attr({ href: '#' + id })
        .addClass('level-' + level)
        .text(text)
        .appendTo(li);
    },
    buildDecimalString: function (decimals) {
      var usedDecimals = []
        , decimal;

      for(var i = 0; i < decimals.length; i++) {
        decimal = decimals[i];
        if (i === decimals.indexOf(0))
          break;
        
        usedDecimals.push(decimal);
      }
      return usedDecimals.join('.') + '.';
    }
  };
  sidebarNavi.build();
}); 