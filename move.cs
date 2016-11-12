using UnityEngine;
using System.Collections;

public class move : MonoBehaviour {


	public float speed=1;
	public Animator animator;

	// Use this for initialization
	void Start () {
		animator = GetComponent<Animator> ();
		animator.SetBool ("attackable", true);
	}

	// Update is called once per frame
	void Update () {

		if (Input.GetKey (KeyCode.A)) {
			transform.Translate (new Vector3 (-0.1f * speed, 0, 0),Space.World);
			transform.rotation = Quaternion.Euler(new Vector3(0,-90,0));
		}
		if (Input.GetKey (KeyCode.D)) {
			transform.Translate (new Vector3 (0.1f * speed, 0, 0),Space.World);
			transform.rotation = Quaternion.Euler(new Vector3(0, 90, 0));
		}
		if (Input.GetKey (KeyCode.W)) {
			transform.Translate (new Vector3 (0, 0, 0.1f * speed),Space.World);
			transform.rotation = Quaternion.Euler(new Vector3(0,0,0));
		}
		if (Input.GetKey (KeyCode.S)) {
			transform.Translate (new Vector3 (0, 0, -0.1f * speed),Space.World);
			transform.rotation = Quaternion.Euler(new Vector3(0,180,0));
		}

		if(Input.GetKey (KeyCode.W)&&Input.GetKey (KeyCode.A))
			transform.rotation = Quaternion.Euler(new Vector3(0,-45,0));
		else if(Input.GetKey (KeyCode.W)&&Input.GetKey (KeyCode.D))
			transform.rotation = Quaternion.Euler(new Vector3(0,45,0));
		else if(Input.GetKey (KeyCode.A)&&Input.GetKey (KeyCode.S))
			transform.rotation = Quaternion.Euler(new Vector3(0,-135,0));
		else if(Input.GetKey (KeyCode.D)&&Input.GetKey (KeyCode.S))
			transform.rotation = Quaternion.Euler(new Vector3(0,135,0));

		if (Input.GetKey (KeyCode.W) || Input.GetKey (KeyCode.A) || Input.GetKey (KeyCode.S) || Input.GetKey (KeyCode.D)) {
			animator.SetBool ("moveing", true);
		} else {
			animator.SetBool ("moveing", false);
		}


		if(Input.GetKeyDown(KeyCode.Space)){
			if (animator.GetBool ("attackable") == true) {
				animator.SetBool ("attack", true);
			}

			}


	}
}
