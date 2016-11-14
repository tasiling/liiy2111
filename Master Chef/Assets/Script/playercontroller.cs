using UnityEngine;
using System.Collections;
using UnityEngine.Networking;

public class playercontroller : NetworkBehaviour {
	private move playermove;
	// Use this for initialization
	void Start () {

	}
	
	// Update is called once per frame
	void Update () {
		if (!isLocalPlayer)
		{
			playermove = GetComponent<move> ();
			playermove.enabled = false;

		}
	}
}
