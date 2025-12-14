// Save settings
function save_options() {
  var speed = document.getElementById('speed').value;
  var showBadge = document.getElementById('showBadge').checked;
  var showProgress = document.getElementById('showProgress').checked;
  var showResume = document.getElementById('showResume').checked;

  chrome.storage.sync.set({
    settings: {
        readingSpeed: parseInt(speed),
        showBadge: showBadge,
        showProgressBar: showProgress,
        showResumeNotification: showResume
    }
  }, function() {
    var status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(function() {
      status.style.display = 'none';
    }, 2000);
  });
}

// Restore settings
function restore_options() {
  chrome.storage.sync.get({
    settings: {
        readingSpeed: 200,
        showBadge: true,
        showProgressBar: true,
        showResumeNotification: true
    }
  }, function(items) {
    document.getElementById('speed').value = items.settings.readingSpeed;
    document.getElementById('speedVal').textContent = items.settings.readingSpeed;
    document.getElementById('showBadge').checked = items.settings.showBadge;
    document.getElementById('showProgress').checked = items.settings.showProgressBar;
    document.getElementById('showResume').checked = items.settings.showResumeNotification;
  });
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('speed').addEventListener('input', function(e) {
    document.getElementById('speedVal').textContent = e.target.value;
});
