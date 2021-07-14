import React, { useState, useEffect } from "react";
import { Contract, getDefaultProvider, providers, utils } from "ethers";
import { config } from "../config";
import abi from "../fixtures/abi.json";
import axios from "axios";

const formatIpfsUrl = (url) => {
  return url.replace(/ipfs:\/\//g, "https://cloudflare-ipfs.com/");
};
const contractAddress = "0xACE5a55fA347c43cdc4271b8931D1338211C8644";
const provider = getDefaultProvider("rinkeby", { alchemy: config.alchemyKey });
const contract = new Contract(contractAddress, abi, provider);

export const HomePage = () => {
  const [mintedNftState, setMintedNftState] = useState({
    state: "UNINITIALIZED",
  });
  const [transactionState, setTansactionState] = useState({
    state: "UNINITIALIZED",
  });

  const modalVisible =
    transactionState.state === "PENDING_METAMASK" ||
    transactionState.state === "PENDING_SIGNER" ||
    transactionState.state === "PENDING_CONFIRMAION";

  const loadRobotsData = async () => {
    setMintedNftState({
      state: "PENDING",
    });
    const totalSupply = await contract.totalSupply();
    const ids = [...Array(totalSupply.toNumber()).keys()];
    const deferredData = ids.reverse().map(async (id) => {
      const ipfsUri = await contract.tokenURI(id);
      const owner = await contract.ownerOf(id);
      const formattedUri = formatIpfsUrl(ipfsUri);
      const metadata = (await axios.get(formattedUri)).data;
      const formattedImage = formatIpfsUrl(metadata.image);
      return {
        id,
        name: metadata.name,
        image: formattedImage,
        description: metadata.description,
        owner,
      };
    });
    const data = await Promise.all(deferredData);
    setMintedNftState({
      state: "SUCCESS",
      data,
    });
  };

  useEffect(() => {
    loadRobotsData();
  }, []);

  const handlePurchase = async () => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") alert("Metamask is not detected");

    setTansactionState({ state: "PENDING_METAMASK" });

    await ethereum.request({ method: "eth_requestAccounts" });

    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);

    setTansactionState({ state: "PENDING_SIGNER" });
    const receipt = await contract.purchase({
      value: utils.parseEther("1"),
    });
    setTansactionState({ state: "PENDING_CONFIRMAION" });
    const transaction = await receipt.wait();
    setTansactionState({ state: "SUCCESS", transaction });

    await loadRobotsData();
  };

  const [recAdress, setRecAddress] = useState("nullAdd");
  const [senderAdress, setSenderAddress] = useState("nullSender");
  const [tokenId, setTokenId] = useState("nullID");

  const handleTransfer = async () => {
    const { ethereum } = window;
    if (typeof ethereum == "undefined") alert("Metamask is not detected");

    setTansactionState({ state: "PENDING_METAMASK" });

    await ethereum.request({ method: "eth_requestAccounts" });

    const provider_MetaMask = new providers.Web3Provider(window.ethereum);
    const signer = provider_MetaMask.getSigner();
    const contract = new Contract(contractAddress, abi, signer);

    setTansactionState({ state: "PENDING_SIGNER" });
    const receipt = await contract.transferFrom(
      senderAdress,
      recAdress,
      tokenId
    );
    setTansactionState({ state: "PENDING_CONFIRMAION" });
    const transaction = await receipt.wait();
    setTansactionState({ state: "SUCCESS", transaction });

    await loadRobotsData();
  };

  return (
    <div className="min-h-screen bg-green-700">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 ">
        <div className="text-gray-100 text-6xl pt-28 pb-20 font-myZoo">
          ANIMALS
        </div>

        <div className="mb-12">
          <button
            onClick={handlePurchase}
            type="button"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Buy Your Own Animal
          </button>
        </div>

        {mintedNftState.state === "PENDING" && (
          <div className="text-xl text-white">LOADING...</div>
        )}

        {mintedNftState.state === "SUCCESS" && (
          <div className="grid md:grid-cols-4 gap-2">
            {mintedNftState.data.map(
              ({ id, image, name, description, owner }) => {
                return (
                  <div key={id} className="bg-white rounded p-2">
                    <div>
                      <img
                        src={image}
                        className="mx-auto p-2 object-scale-down h-80"
                        alt={name}
                      />
                    </div>

                    <div className="text-xl">{name}</div>

                    <div className="">{description}</div>
                    <hr className="my-4" />

                    <div className="text-left text-sm">Owned By:</div>
                    <div className="text-left text-xs tracking-tighter">
                      {owner}
                    </div>

                    <div className="text-left text-xs m-1 space-x-1">
                      <label>Transfer To:</label>
                      <input
                        className="rounded-md"
                        type="text"
                        onChange={(event) => {
                          setRecAddress(event.target.value);
                          setSenderAddress(owner);
                          setTokenId(id);
                        }}
                      />

                      <button
                        className=" items-center px-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-900 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        onClick={handleTransfer}
                      >
                        Gift
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {modalVisible && (
        <div
          className="fixed z-10 inset-0 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
            />
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              ​
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                  <svg
                    className="h-6 w-6 text-yellow-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3
                    className="text-lg leading-6 font-medium text-gray-900"
                    id="modal-title"
                  >
                    {transactionState.state === "PENDING_METAMASK" &&
                      "Connecting Metamask..."}
                    {transactionState.state === "PENDING_SIGNER" &&
                      "Waiting for Signed Transaction"}
                    {transactionState.state === "PENDING_CONFIRMAION" &&
                      "Waiting for Block Confirmation"}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {transactionState.state === "PENDING_METAMASK" &&
                        "Allow Metamask to connect to this application in the extension."}
                      {transactionState.state === "PENDING_SIGNER" &&
                        "Approve the transaction within the Metamask extension"}
                      {transactionState.state === "PENDING_CONFIRMAION" &&
                        "Transaction has been sent to the blockchain. Please wait while the transaction is being confirmed."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
