App = {
  loading: false,
  contracts: {},
  
  load: async () => {
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContract();
    await App.render();
  },

  loadWeb3: async () => {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      window.alert("Please connect to MetaMask.");
    }

    if (window.ethereum) {
      window.web3 = new Web3(ethereum);
      try {
        await ethereum.enable();
      } catch (error) {
        console.error("User denied account access");
      }
    } else if (window.web3) {
      App.web3Provider = web3.currentProvider;
      window.web3 = new Web3(web3.currentProvider);
    } else {
      console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    }
  },

  loadAccount: async () => {
    const accounts = await web3.eth.getAccounts();
    App.account = accounts[0];
    console.log("Account loaded:", App.account);
  },

  loadContract: async () => {
    const votingSystem = await $.getJSON('/build/contracts/Voting.json');// Load ABI
    App.contracts.Voting = TruffleContract(votingSystem);
    App.contracts.Voting.setProvider(App.web3Provider);
    App.votingSystem = await App.contracts.Voting.deployed();
  },

  render: async () => {
    if (App.loading) return;
    App.setLoading(true);

    $('#account').html(App.account);

    await App.renderPolls(); // Load the poll options

    App.setLoading(false);
  },

  renderPolls: async () => {
    const pollCount = await App.votingSystem.pollsCount(); // Get total number of polls
    const $pollTemplate = $('.pollTemplate');
  
    for (let i = 0; i < pollCount; i++) {
      const poll = await App.votingSystem.polls(i);
      const question = poll.question;
  
      // Fetch the poll options using the new getter
      const options = await App.votingSystem.getPollOptions(i); // Call the new getter
  
      const $newPollTemplate = $pollTemplate.clone();
      $newPollTemplate.find('.question').html(question);
  
      // Add options to the poll template
      options.forEach((option, index) => {
        $newPollTemplate.find('.options').append(`
          <label>
            <input type="radio" name="poll_${i}" value="${index}" data-pollIndex="${i}" /> ${option}
          </label><br>
        `);
      });
  
      $('#pollsList').append($newPollTemplate);
      $newPollTemplate.show();
    }
  },
  
  

  // Handle the "Create Poll" button click
  createPoll: async () => {
    const question = $('#question').val();
    const optionsInput = $('#options').val();
    const options = optionsInput.split(',').map(option => option.trim()); // Convert comma-separated options to an array

    if (!question || options.length === 0) {
      alert("Please enter a question and at least one option.");
      return;
    }

    // Call the createPoll function in the contract
    await App.votingSystem.createPoll(question, options, { from: App.account });
    alert("Poll created successfully!");

    // Reload the polls list
    await App.renderPolls();
  },

  vote: async () => {
    const selectedPollIndex = $('input[name="poll"]:checked').data('pollIndex');
    const selectedOptionIndex = $('input[name="poll_' + selectedPollIndex + '"]:checked').val();

    // Ensure QR code is uploaded
    const qrCode = $('#qrUpload')[0].files[0];

    // Debug logs to check if values are being properly retrieved
  console.log("Selected Poll Index:", selectedPollIndex);
  console.log("Selected Option Index:", selectedOptionIndex);
  console.log("Uploaded QR Code File:", qrCode);


    if (!selectedOptionIndex || !qrCode) {
      alert("Please select an option and upload a QR code.");
      return;
    }

    // Decode QR code
    const qrData = await App.decodeQRCodeFromFile(qrCode);  // Decode QR code
    console.log("data is:",qrData);//for debug

    if (qrData) {
      console.log("Decoded QR Data:", qrData);
      await App.votingSystem.vote(selectedPollIndex, selectedOptionIndex, qrData, { from: App.account });
      alert("Vote successfully submitted!");

      // Show the voters list after voting
      await App.showVotersList();
    } else {
      alert("Invalid QR code.");
    }
  },

  decodeQRCodeFromFile: async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, canvas.width, canvas.height);
          if (qrCode) {
            resolve(qrCode.data); // Return QR code data
          } else {
            reject("QR code not found");
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  showVotersList: async () => {
    const votersList = await App.votingSystem.getVoters(); // Assuming this method returns voters list
    const $votersList = $('#votersList');
    $votersList.empty();

    votersList.forEach(voter => {
      $votersList.append(`<li>${voter}</li>`);
    });

    $('#votersListSection').show();
  },

  setLoading: (boolean) => {
    App.loading = boolean;
    const loader = $('#loader');
    const content = $('#content');
    if (boolean) {
      loader.show();
      content.hide();
    } else {
      loader.hide();
      content.show();
    }
  }
};

$(async () => {
  await App.load();

  // Bind the createPoll button
  $('#createPollBtn').click(async () => {
    await App.createPoll();
  });
});
