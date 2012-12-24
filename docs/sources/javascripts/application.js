$(function() {
  prettyPrint();

  /**
   * Handle style switch clicking
   *  + Remember state
   */

  // Default style?
  var style = localStorage.getItem('doc-style');
  if (!style) {
    style = 'style-dark';
    localStorage.setItem('doc-style', style);
  }

  var logo = 'images/logo-dark.png';
  if (style === 'style-dark') {
    logo = 'images/logo.png';
  }

  $('html').removeClass().addClass(style);
  $('img.logo').attr({ src: logo });

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

    localStorage.setItem('doc-style', newClass);
    $('html').removeClass().addClass(newClass);
    $('img.logo').attr({ src: newLogo });
  });

  /**
   * Shows / hides the sidebar depending on mouse x position
   */
  $(document).mousemove(function (e) {
    var mouseX = e.pageX;
    var windowW = $(window).width();
    var viewportTooSmall = windowW <= $('.content-wrapper').width() + $('.sidebar').width() * 2;
    if (mouseX <= windowW / 4 && viewportTooSmall) {
      $('.sidebar').removeClass('hidden');
    } else if (mouseX >= windowW / 4 && viewportTooSmall) {
      $('.sidebar').addClass('hidden');
    } else {
      $('.sidebar').removeClass('hidden');
    }
  });

  /**
   * Generates the sidebar navigation from all headlines
   * and gives them numbers
   */

  var sidebarNavi = {
    activeTopLevelContainer: null,
    handle: function() {
      var sidebar = $('.sidebar');
      sidebar.find('.level-0').click(function (){
        $(this).parent().find('.level-0').removeClass('open');
        $(this).addClass('open');
      });
      this.scrollSpy();
    },
    scrollSpy: function () {
      var sidebar = $('.sidebar');
      $('section').each(function () {
        $(this).scrollspy({
          min: $(this).position().top,
          max: $(this).position().top + $(this).height(),
          onEnter: function (element, position) {
            // Deactivate all subnavigation items
            sidebar.find('.level-0').removeClass('open');
            sidebar.find('*').removeClass('active');

            // Find the according navigation item
            var item = sidebar.find('[data-id=' + $(element).attr('id') + ']').first();

            item.closest('.level-0').addClass('open');
            item.find('> a').addClass('active');
          }
        });
      });
    },
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

        self.addListItem(level, section.attr('id'), text, decimals)
      });
    },
    addListItem: function (level, id, text, decimalArr) {
      var li = $('<li>').addClass('level-' + level).attr({ 'data-id': id });
      var a = $('<a>')
        .attr({ href: '#' + id })
        .text(text)
        .appendTo(li);

      if (level === 0) {
        var ul = $('<ul>').appendTo(li);

        this.activeTopLevelContainer = ul;

        li.appendTo($('.sidebar ul.items'));
      } else {
        li.appendTo(this.activeTopLevelContainer);
      }

      if (decimalArr[0] === 1 && level === 0) {
        li.addClass('open');
      }
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
  sidebarNavi.handle();
}); 